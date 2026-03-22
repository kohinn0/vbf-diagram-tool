import os
import sys
import json
import re
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import schemas, auth, database
from .auth import limiter as rate_limiter

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_fake")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_fake")
CARD_PAYMENTS_ENABLED = (os.getenv("CARD_PAYMENTS_ENABLED", "0") or "").strip().lower() in ("1", "true", "yes", "on")

# Összegek HUF (utalás és Stripe is; admin subscription_plans-ból is tölthető később)
AMOUNT_MONTHLY_HUF = 12990
AMOUNT_YEARLY_HUF = 99000


class CheckoutRequest(BaseModel):
    plan: str = "yearly"  # 'monthly' or 'yearly'
    email: str | None = None   # regisztrációhoz: ezzel a címmel jön létre a user
    password: str | None = None  # vásárláskor megadott jelszó → adatbázisba kerül
    return_page: str = "index"  # "index" | "app" — Stripe visszatérési URL


def _amount_huf_for_plan(plan_type: str) -> int:
    if plan_type == "monthly":
        return AMOUNT_MONTHLY_HUF
    return AMOUNT_YEARLY_HUF

def _get_pro_prices_huf(db: Session):
    """PRO csomag árai HUF (subscription_plans). Ha nincs vagy 0, fallback konstans."""
    plan = db.query(database.SubscriptionPlan).filter(database.SubscriptionPlan.plan_key == "PRO").first()
    monthly = (plan and plan.price_monthly) or AMOUNT_MONTHLY_HUF
    yearly = (plan and plan.price_yearly) or AMOUNT_YEARLY_HUF
    if monthly <= 0:
        monthly = AMOUNT_MONTHLY_HUF
    if yearly <= 0:
        yearly = AMOUNT_YEARLY_HUF
    return monthly, yearly


@router.get("/api/payments/card-payments-enabled")
def card_payments_enabled_endpoint():
    """Frontend: megjelenjen-e a bankkártyás (Stripe) gomb a kosárban."""
    return {"enabled": bool(CARD_PAYMENTS_ENABLED)}


@router.get("/api/payments/session-status")
def session_status(session_id: str = None):
    """Stripe session ellenőrzése: csak paid esetén mutassuk a sikert a frontenden."""
    if not CARD_PAYMENTS_ENABLED:
        return {"paid": False, "email": None}
    if not session_id:
        return {"paid": False, "email": None}
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        paid = (
            getattr(session, "status", None) == "complete"
            and getattr(session, "payment_status", None) == "paid"
        )
        email = None
        if hasattr(session, "customer_details") and session.customer_details:
            email = getattr(session.customer_details, "email", None) or (session.customer_details.get("email") if isinstance(session.customer_details, dict) else None)
        return {"paid": bool(paid), "email": email}
    except Exception:
        return {"paid": False, "email": None}


@router.post("/api/payments/create-checkout-session")
def create_checkout_session(request: Request, body: CheckoutRequest, db: Session = Depends(auth.get_db)):
    if not CARD_PAYMENTS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="A bankkártyás fizetés ideiglenesen szünetel. Válaszd az utalásos számla kérést.",
        )
    # Determine the host dynamically for success/cancel URLs based on the Referer or Host
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    
    if origin:
        domain_url = origin
    elif referer:
        domain_url = referer.rstrip("/")
    else:
        domain_url = str(request.url).split("/api")[0]
        
    # Ensure domain url is correctly pointing to frontend
    domain_url = domain_url.replace(":8001", ":8080")

    rp = (body.return_page or "index").strip().lower()
    if rp not in ("index", "app"):
        rp = "index"
    return_html = "app.html" if rp == "app" else "index.html"

    monthly_huf, yearly_huf = _get_pro_prices_huf(db)
    if body.plan == "monthly":
        name = 'Villamos Biztonsági Felülvizsgáló (VBF) Tervező - Havi Előfizetés'
        desc = 'Maximum 15 jegyzőkönyv generálása havonta. Alap funkciók.'
        amount = monthly_huf * 100  # Stripe HUF fillérben
    else:
        name = 'Villamos Biztonsági Felülvizsgáló (VBF) Tervező - 1 Éves Előfizetés'
        desc = 'Minden funkció elérése 1 éven át. Korlátlan technikus hozzáadása és jegyzőkönyv generálás.'
        amount = yearly_huf * 100  # fillérben
        
    customer_email = (body.email or "").strip().lower() if body.email else None
    if customer_email and "@" not in customer_email:
        customer_email = None
    if body.password and not customer_email:
        raise HTTPException(status_code=400, detail="Jelszó megadásához e-mail cím is szükséges.")
    if body.password:
        auth.validate_password_policy(body.password)
    try:
        create_params = {
            "payment_method_types": ["card"],
            "line_items": [{
                "price_data": {
                    "currency": "huf",
                    "product_data": {"name": name, "description": desc},
                    "unit_amount": amount,
                },
                "quantity": 1,
            }],
            "mode": "payment",
            "success_url": domain_url + f"/{return_html}?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": domain_url + f"/{return_html}",
            "metadata": {"plan_type": body.plan},
            "allow_promotion_codes": True,
        }
        if customer_email:
            create_params["customer_email"] = customer_email
        session = stripe.checkout.Session.create(**create_params)
        if body.password and customer_email:
            pending = database.PendingCheckoutPassword(
                stripe_session_id=session.id,
                email=customer_email,
                password_hash=auth.get_password_hash(body.password),
            )
            db.add(pending)
            db.commit()
        return {"id": session.id, "url": session.url}
    except Exception as e:
        print(f"Checkout error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/payments/request-bank-transfer", response_model=schemas.BankTransferResponse)
@rate_limiter.limit("5/15minute")
def request_bank_transfer(
    request: Request,
    body: schemas.BankTransferRequest,
    db: Session = Depends(auth.get_db),
):
    """
    Utalásos fizetés kérése: számla készül (szamlazz.hu), email megy a vásárlónak.
    Nincs token vagy hozzáférés visszaadva – a böngészőben nem lehet ezzel matatni.
    Hozzáférés csak akkor jár, ha egy főadmin a megrendelést „Fizetve”-re állítja.
    """
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Érvényes e-mail cím szükséges.")
    if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email):
        raise HTTPException(status_code=400, detail="Érvényes e-mail cím szükséges.")
    address = (body.buyer_address or "").strip()
    if not address or len(address) < 5:
        raise HTTPException(status_code=400, detail="Számlázási cím megadása kötelező (irányítószám, város, cím).")
    name = (body.customer_name or "").strip() or "Vásárló"
    plan_type = (body.plan_type or "yearly").lower()
    if plan_type not in ("monthly", "yearly"):
        plan_type = "yearly"
    amount_huf = _amount_huf_for_plan(plan_type)

    order = database.PendingOrder(
        email=email,
        customer_name=name[:200],
        plan_type=plan_type,
        amount_huf=amount_huf,
        status="PENDING",
        buyer_zip=(body.buyer_zip or "").strip()[:10] or None,
        buyer_city=(body.buyer_city or "").strip()[:100] or None,
        buyer_address=(body.buyer_address or "").strip()[:200] or None,
        buyer_tax_number=(body.buyer_tax_number or "").strip()[:20] or None,
    )
    db.add(order)
    db.flush()
    pdf_bytes = None
    try:
        inv_num = None
        try:
            from szamlazz_client import create_invoice_for_pending_order
            inv_num, pdf_bytes = create_invoice_for_pending_order(order)
        except Exception:
            pass
        if inv_num:
            order.invoice_number = inv_num
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.commit()

    _send_bank_transfer_info_email(order, pdf_attachment=pdf_bytes)

    if (os.getenv("DIJBEKERO_ON_BANK_TRANSFER", "0") or "").strip().lower() in ("1", "true", "yes", "on"):
        try:
            import dijbekero as dijbekero_mod
            sorszam = dijbekero_mod.get_next_sorszam(db)
            db.commit()
            due = (datetime.utcnow() + timedelta(days=14)).strftime("%Y.%m.%d")
            plan_label = "havi" if order.plan_type == "monthly" else "éves"
            pdf_d = dijbekero_mod.generate_dijbekero_pdf(
                amount_huf=order.amount_huf,
                description=f"VBF Premium – {plan_label} előfizetés",
                due_date=due,
                vevo_nev=order.customer_name,
                vevo_cim=(" ".join(filter(None, [order.buyer_zip, order.buyer_city, order.buyer_address])) or None),
                sorszam=sorszam,
            )
            dijbekero_mod.send_dijbekero_email(
                to_email=order.email,
                pdf_bytes=pdf_d,
                amount_huf=order.amount_huf,
                description=f"VBF Premium – {plan_label} előfizetés",
                due_date=due,
                vevo_nev=order.customer_name,
                sorszam=sorszam,
            )
        except Exception as e:
            import logging
            logging.getLogger("vbf").exception("Díjbekérő automatikus küldés hiba: %s", e)

    return schemas.BankTransferResponse(
        message="Köszönjük! A számlát elküldtük az email címedre. A hozzáférés (új előfizetés vagy meglévő meghosszabbítása) aktiválásra kerül, amint az utalást jóváhagyjuk (általában 1-2 munkanap)."
    )


def _send_bank_transfer_info_email(order, pdf_attachment: bytes = None):
    import smtplib
    from email.message import EmailMessage
    smtp_server = os.getenv("SMTP_SERVER", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    if not (smtp_server and smtp_user and smtp_pass):
        return
    msg = EmailMessage()
    msg["Subject"] = "VBF Tervező – utalásos megrendelés"
    msg["From"] = smtp_user
    msg["To"] = order.email
    plan_label = "havi" if order.plan_type == "monthly" else "éves"
    msg.set_content(
        f"Kedves {order.customer_name}!\n\n"
        f"Megkaptuk az utalásos megrendelésedet ({plan_label} előfizetés, {order.amount_huf} Ft).\n"
        "A számlát a fenti adataid alapján elkészítettük; ha a Szamlazz.hu be van állítva, a számla csatolva vagy linkelve lehet.\n\n"
        "A hozzáférés (belépési adatok) aktiválásra kerül, amint az utalást jóváhagyjuk – általában 1-2 munkanap.\n\n"
        "Üdvözlettel,\nA VBF Csapat"
    )
    if pdf_attachment:
        msg.add_attachment(pdf_attachment, maintype="application", subtype="pdf", filename="szamla.pdf")
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as e:
        import logging
        logging.getLogger("vbf").exception("SMTP hiba utalásos email: %s", e)


def _plan_duration_timedelta(plan_type: str) -> timedelta:
    pt = (plan_type or "yearly").lower()
    if pt == "monthly":
        return timedelta(days=31)
    return timedelta(days=365)


def _stacked_subscription_expiry_for_company(db: Session, company_id: int, plan_type: str) -> datetime:
    """
    Új előfizetés lejárata: ha a cégnél van még érvényes (jövőbeli) lejárat, arra ráépítjük a csomagot;
    ha lejárt vagy nincs, a mai naptól számolunk. Így hosszabbítás és új vásárlás ugyanazzal a folyamattal intézhető.
    """
    now = datetime.utcnow()
    delta = _plan_duration_timedelta(plan_type)
    base = now
    users = (
        db.query(database.User)
        .filter(
            database.User.company_id == company_id,
            database.User.deleted_at == None,
            database.User.role.in_(("TECH", "COMPANY_ADMIN")),
        )
        .all()
    )
    for u in users:
        exp = getattr(u, "subscription_expires", None)
        if exp and exp > base:
            base = exp
    return base + delta


def grant_access_after_payment(db: Session, customer_email: str, customer_name: str, plan_type: str, pdf_attachment: bytes = None, stripe_session_id: str = None):
    """
    Fizetés után (Stripe vagy utalás jóváhagyás): cég + user PRO hozzáférés, email.
    Meglévő aktív előfizetés esetén a cég összes TECH / COMPANY_ADMIN userének lejárata ugyanarra a
    meghosszabbított dátumra kerül (ráépítés a legkésőbbi érvényes lejáratra).
    Ha stripe_session_id megvan és van hozzá pending jelszó, azt használjuk (adatbázisba kerül).
    Csak backendről hívandó (webhook vagy admin mark-paid).
    """
    plan_key = "PRO"

    db_user = db.query(database.User).filter(database.User.email == customer_email).first()
    company = None
    if db_user and db_user.company_id:
        company = db.query(database.Company).filter(database.Company.id == db_user.company_id).first()
    if not company:
        company = database.Company(
            name=customer_name[:200] or "Vásárló",
            plan=plan_key,
            reports_per_month_limit=None,
            max_users=None,
        )
        db.add(company)
        db.flush()
    if company.plan != plan_key:
        company.plan = plan_key
    db.commit()
    db.refresh(company)

    if db_user:
        db_user.company_id = company.id
        if db_user.role in ("TECH", "COMPANY_ADMIN"):
            db_user.role = "COMPANY_ADMIN"
        db.flush()

        new_sub_expiry = _stacked_subscription_expiry_for_company(db, company.id, plan_type)
        crew = (
            db.query(database.User)
            .filter(
                database.User.company_id == company.id,
                database.User.deleted_at == None,
                database.User.role.in_(("TECH", "COMPANY_ADMIN")),
            )
            .all()
        )
        for u in crew:
            u.subscription_expires = new_sub_expiry
        db.commit()
        _send_access_email(
            db_user.username,
            customer_email,
            None,
            plan_type,
            is_new=False,
            pdf_attachment=pdf_attachment,
            subscription_valid_until=new_sub_expiry,
        )
    else:
        import string
        import random
        hashed_password = None
        if stripe_session_id:
            pending = db.query(database.PendingCheckoutPassword).filter(
                database.PendingCheckoutPassword.stripe_session_id == stripe_session_id
            ).first()
            if pending:
                hashed_password = pending.password_hash
                db.delete(pending)
        if hashed_password is None:
            temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
            hashed_password = auth.get_password_hash(temp_password)
        else:
            temp_password = None
        base_username = customer_email.split('@')[0]
        username = base_username
        counter = 1
        while db.query(database.User).filter(database.User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        new_sub_expiry = _stacked_subscription_expiry_for_company(db, company.id, plan_type)
        new_user = database.User(
            username=username,
            email=customer_email,
            hashed_password=hashed_password,
            role="COMPANY_ADMIN",
            is_active=True,
            company_id=company.id,
            subscription_expires=new_sub_expiry,
        )
        db.add(new_user)
        db.commit()
        _send_access_email(
            username,
            customer_email,
            temp_password,
            plan_type,
            is_new=True,
            pdf_attachment=pdf_attachment,
            subscription_valid_until=new_sub_expiry,
        )


@router.post("/api/payments/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(auth.get_db)):
    if not CARD_PAYMENTS_ENABLED:
        return {"status": "ignored", "reason": "card_payments_disabled"}
    # Prod védelem: ha nincs valós webhook secret beállítva, ne engedjük a webhookot működni
    if STRIPE_WEBHOOK_SECRET == "whsec_fake" and os.getenv("TESTING") != "1":
        raise HTTPException(
            status_code=500,
            detail="Stripe webhook secret nincs konfigurálva. Állítsd be a STRIPE_WEBHOOK_SECRET környezeti változót."
        )

    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        if STRIPE_WEBHOOK_SECRET == "whsec_fake" and os.getenv("TESTING") == "1":
            # Lokális / teszt környezet: engedjük a szignó nélküli eventet
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
        else:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
    except Exception as e:
        print(f"Webhook signature verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Érvénytelen aláírás (webhook).")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_details = session.get('customer_details') or {}
        customer_email = customer_details.get('email')
        customer_name = (customer_details.get('name') or customer_email or "").strip() or "Vásárló"
        if customer_email:
            plan_type = session.get('metadata', {}).get('plan_type', 'yearly')
            amount_total = session.get('amount_total') or 0
            amount_huf = int(amount_total) // 100
            pdf_bytes = None
            try:
                from szamlazz_client import create_invoice_for_stripe_session
                __, pdf_bytes = create_invoice_for_stripe_session(session, None, plan_type)
            except Exception as e:
                import logging
                logging.getLogger("vbf").warning("Szamlazz.hu számla kihagyva vagy hiba: %s", e)
            grant_access_after_payment(db, customer_email, customer_name, plan_type, pdf_attachment=pdf_bytes, stripe_session_id=session.get("id"))
            company = db.query(database.Company).join(database.User).filter(database.User.email == customer_email).first()
            if company:
                log = database.PaymentLog(
                    email=customer_email,
                    customer_name=customer_name,
                    plan_type=plan_type,
                    amount_huf=amount_huf or _amount_huf_for_plan(plan_type),
                    payment_method="stripe",
                    stripe_session_id=session.get('id'),
                    company_id=company.id,
                    status="completed",
                )
                db.add(log)
                db.commit()

    return {"status": "success"}


def _send_access_email(
    username: str,
    to_email: str,
    password: Optional[str],
    plan_type: str,
    is_new: bool,
    pdf_attachment: bytes = None,
    subscription_valid_until: Optional[datetime] = None,
):
    import smtplib
    from email.message import EmailMessage
    smtp_server = os.getenv("SMTP_SERVER", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    if not (smtp_server and smtp_user and smtp_pass):
        return
    msg = EmailMessage()
    msg['Subject'] = "Sikeres előfizetés: VBF Tervező hozzáférés"
    msg['From'] = smtp_user
    msg['To'] = to_email
    valid_suffix = ""
    if subscription_valid_until:
        valid_suffix = (
            f"\nElőfizetés lejárata (céges PRO): "
            f"{subscription_valid_until.strftime('%Y-%m-%d %H:%M')} UTC körül.\n"
        )
    if is_new:
        if password:
            content = (
                f"Kedves Felhasználó!\n\nSikeresen megvásároltad a VBF Tervező "
                f"{'havi' if plan_type == 'monthly' else 'éves'} előfizetést.\n\n"
                "Belépési adataid (céges vezető):\n"
                f"Felhasználónév: {username}\nJelszó: {password}\n\n"
                f"{valid_suffix}"
                "Kérjük első belépés után változtasd meg a jelszavad!\n\nÜdvözlettel,\nA VBF Csapat"
            )
        else:
            content = (
                f"Kedves Felhasználó!\n\nSikeresen megvásároltad a VBF Tervező "
                f"{'havi' if plan_type == 'monthly' else 'éves'} előfizetést.\n\n"
                "Belépési adataid (céges vezető):\n"
                f"Felhasználónév: {username}\n"
                f"{valid_suffix}"
                "A belépéshez a vásárláskor megadott jelszavadat használd.\n\nÜdvözlettel,\nA VBF Csapat"
            )
    else:
        content = (
            f"Kedves Felhasználó!\n\nAz előfizetésedet meghosszabbítottuk / aktiváltuk "
            f"({'havi' if plan_type == 'monthly' else 'éves'} csomag). "
            "Ha már volt aktív időszakod, az új időt arra ráépítettük (nem veszíted el a hátralévő napokat)."
            f"{valid_suffix}"
            "A meglévő belépési adataiddal továbbra is használhatod a rendszert.\n\nÜdvözlettel,\nA VBF Csapat"
        )
    msg.set_content(content)
    if pdf_attachment:
        msg.add_attachment(pdf_attachment, maintype="application", subtype="pdf", filename="szamla.pdf")
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as e:
        import logging
        logging.getLogger("vbf").exception("SMTP hiba a hozzáférés email küldésekor: %s", e)
