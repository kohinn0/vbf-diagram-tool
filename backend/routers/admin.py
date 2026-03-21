from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query, Body, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import schemas, auth, database, generator
from fastapi.responses import StreamingResponse
import stripe

import dijbekero as dijbekero_mod

router = APIRouter()


def _is_super_admin(user: database.User) -> bool:
    return user.role in ("SUPER_ADMIN", "ADMIN")


def _admin_user_scope_query(db: Session, current_admin: database.User):
    """Felhasználók lekérdezése: super admin = minden, céges vezető = csak a saját cégé."""
    q = db.query(database.User).filter(database.User.deleted_at == None)
    if _is_super_admin(current_admin):
        return q
    return q.filter(database.User.company_id == current_admin.company_id)


def _user_response(db: Session, u: database.User) -> schemas.UserResponse:
    db.refresh(u, ["company"])
    return schemas.UserResponse(
        id=u.id, username=u.username, email=u.email, is_active=u.is_active,
        role=u.role, company_id=u.company_id,
        company_name=u.company.name if u.company else None,
        subscription_expires=u.subscription_expires,
        company_plan=u.company.plan if u.company else None,
        pdf_export_watermarked=database.user_pdf_export_watermarked(db, u),
    )


# ─── Utalásos megrendelések (csak super admin: listázás, jóváhagyás) ───
@router.get("/api/admin/pending-orders", response_model=List[schemas.PendingOrderResponse])
def list_pending_orders(
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    """Függőben lévő utalásos megrendelések – csak főadmin."""
    orders = db.query(database.PendingOrder).filter(
        database.PendingOrder.status == "PENDING"
    ).order_by(database.PendingOrder.created_at.desc()).all()
    return orders


@router.get(
    "/api/admin/marketing-subscribers",
    response_model=List[schemas.MarketingSubscriberAdminResponse],
)
def admin_list_marketing_subscribers(
    active_only: bool = True,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    """Marketing / hírlevél feliratkozók exportálható listája (főadmin)."""
    q = db.query(database.MarketingSubscriber).order_by(
        database.MarketingSubscriber.created_at.desc()
    )
    if active_only:
        q = q.filter(database.MarketingSubscriber.unsubscribed_at == None)
    return q.limit(5000).all()


@router.post("/api/admin/pending-orders/{order_id}/mark-paid")
def mark_pending_order_paid(
    order_id: int,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    """
    Utalásos megrendelés jóváhagyása: cég + user + hozzáférési email.
    Csak főadmin hívhatja – a böngészőből nem lehet ezt megkerülni.
    """
    order = db.query(database.PendingOrder).filter(
        database.PendingOrder.id == order_id,
        database.PendingOrder.status == "PENDING",
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Megrendelés nem található vagy már feldolgozva.")
    from routers import payments
    payments.grant_access_after_payment(db, order.email, order.customer_name, order.plan_type)
    order.status = "PAID"
    order.paid_at = datetime.utcnow()
    u = db.query(database.User).filter(database.User.email == order.email).first()
    if u and u.company_id:
        order.company_id = u.company_id
    db.flush()
    log = database.PaymentLog(
        email=order.email,
        customer_name=order.customer_name,
        plan_type=order.plan_type,
        amount_huf=order.amount_huf,
        payment_method="bank_transfer",
        pending_order_id=order.id,
        company_id=order.company_id,
        status="completed",
    )
    db.add(log)
    db.commit()
    return {"status": "ok", "message": "Hozzáférés aktiválva, email kiküldve."}


@router.get("/api/admin/payment-history", response_model=List[schemas.PaymentLogResponse])
def list_payment_history(
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    """Vásárlási előzmények: Stripe + utalás egy listában – csak főadmin."""
    logs = db.query(database.PaymentLog).order_by(database.PaymentLog.created_at.desc()).all()
    return logs


@router.post("/api/admin/payment-logs/{log_id}/refund")
def refund_payment(
    log_id: int,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    """
    Stripe visszatérítés + hozzáférés visszavonása. Csak stripe, completed tételre.
    Utalásos tételt ne itt térítsük (üzleti egyeztetés).
    """
    log = db.query(database.PaymentLog).filter(
        database.PaymentLog.id == log_id,
        database.PaymentLog.payment_method == "stripe",
        database.PaymentLog.status == "completed",
    ).first()
    if not log or not log.stripe_session_id:
        raise HTTPException(status_code=404, detail="Stripe fizetés nem található vagy már visszatérítve.")
    try:
        session = stripe.checkout.Session.retrieve(log.stripe_session_id)
        pi = session.payment_intent
        payment_intent_id = pi if isinstance(pi, str) else (getattr(pi, "id", None) if pi else None)
        if not payment_intent_id:
            raise HTTPException(status_code=400, detail="Nincs payment_intent a sessionben.")
        stripe.Refund.create(payment_intent=payment_intent_id)
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(status_code=400, detail=f"Stripe visszatérítés sikertelen: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    # Hozzáférés visszavonása: cég plan = FREE, user subscription_expires = múlt
    company = db.query(database.Company).filter(database.Company.id == log.company_id).first()
    if company:
        company.plan = "FREE"
        for u in db.query(database.User).filter(database.User.company_id == company.id).all():
            u.subscription_expires = datetime.utcnow() - timedelta(days=1)
    log.status = "refunded"
    log.refunded_at = datetime.utcnow()
    db.commit()
    return {"status": "ok", "message": "Visszatérítés elküldve, hozzáférés visszavonva."}


# ─── Díjbekérő PDF (NAV-kötés nélkül – csak super admin) ───
@router.post("/api/admin/dijbekero-pdf")
def generate_dijbekero_pdf_endpoint(
    body: Optional[schemas.DijbekeroRequest] = Body(default=None),
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    """Díjbekérő PDF letöltése. Céges adatok: IMPRINT_* env. Logó: Céges adatok vagy IMPRINT_LOGO_PATH."""
    if current_admin.role not in ("SUPER_ADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Csak főadmin hozhat létre díjbekérőt.")
    logo_path = os.getenv("IMPRINT_LOGO_PATH")
    if not logo_path and current_admin.company_id:
        settings = db.query(database.CompanySettings).filter(
            database.CompanySettings.company_id == current_admin.company_id
        ).first()
        if settings and settings.logo_path and os.path.exists(settings.logo_path):
            logo_path = settings.logo_path
    if not logo_path:
        settings = db.query(database.CompanySettings).filter(
            database.CompanySettings.owner_id == current_admin.id
        ).first()
        if settings and settings.logo_path and os.path.exists(settings.logo_path):
            logo_path = settings.logo_path
    if not logo_path:
        settings = db.query(database.CompanySettings).filter(
            database.CompanySettings.logo_path.isnot(None),
        ).first()
        if settings and settings.logo_path and os.path.exists(settings.logo_path):
            logo_path = settings.logo_path
    b = body or schemas.DijbekeroRequest()
    sorszam = dijbekero_mod.get_next_sorszam(db)
    db.commit()
    pdf_bytes = dijbekero_mod.generate_dijbekero_pdf(
        amount_huf=b.amount_huf,
        description=(b.description or "").strip() or None,
        due_date=(b.due_date or "").strip() or None,
        vevo_nev=(b.vevo_nev or "").strip() or None,
        vevo_cim=(b.vevo_cim or "").strip() or None,
        logo_path=logo_path,
        sorszam=sorszam,
    )
    send_to = (b.send_to_email or "").strip()
    if send_to and "@" in send_to:
        try:
            dijbekero_mod.send_dijbekero_email(
                to_email=send_to,
                pdf_bytes=pdf_bytes,
                amount_huf=b.amount_huf,
                description=(b.description or "").strip() or None,
                due_date=(b.due_date or "").strip() or None,
                vevo_nev=(b.vevo_nev or "").strip() or None,
                sorszam=sorszam,
            )
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Email küldés sikertelen: {str(e)}")
        from fastapi.responses import JSONResponse
        return JSONResponse({"message": f"Díjbekérő {sorszam} elküldve a következő címre: {send_to}", "sorszam": sorszam})
    from io import BytesIO
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=dijbekero-{sorszam}.pdf"},
    )


# ─── Díjbekérő sablonok (preset) ───
@router.get("/api/admin/dijbekero-presets", response_model=List[schemas.DijbekeroPresetResponse])
def list_dijbekero_presets(
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    presets = db.query(database.DijbekeroPreset).order_by(database.DijbekeroPreset.sort_order, database.DijbekeroPreset.id).all()
    return presets


@router.post("/api/admin/dijbekero-presets", response_model=schemas.DijbekeroPresetResponse)
def create_dijbekero_preset(
    body: schemas.DijbekeroPresetCreate,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    max_order = db.query(database.DijbekeroPreset).count()
    preset = database.DijbekeroPreset(
        name=(body.name or "").strip()[:128] or "Sablon",
        amount_huf=body.amount_huf,
        description=(body.description or "").strip()[:256] or None,
        sort_order=max_order,
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@router.delete("/api/admin/dijbekero-presets/{preset_id}")
def delete_dijbekero_preset(
    preset_id: int,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    db.query(database.DijbekeroPreset).filter(database.DijbekeroPreset.id == preset_id).delete()
    db.commit()
    return {"ok": True}


# ─── Határidő emlékeztető (cron hívja, pl. naponta) ───
@router.post("/api/internal/dijbekero-reminders")
def run_dijbekero_reminders(
    request: Request,
    db: Session = Depends(auth.get_db),
):
    """PENDING megrendelések emlékeztetője (3+ napja nincs befizetés). Cron: X-Cron-Secret header."""
    secret = (os.getenv("DIJBEKERO_REMINDER_CRON_SECRET", "") or "").strip()
    if not secret:
        raise HTTPException(status_code=501, detail="Emlékeztető nincs konfigurálva.")
    provided = (request.headers.get("X-Cron-Secret") or request.query_params.get("secret") or "").strip()
    if provided != secret:
        raise HTTPException(status_code=403, detail="Érvénytelen secret.")

    threshold = datetime.utcnow() - timedelta(days=3)
    orders = (
        db.query(database.PendingOrder)
        .filter(
            database.PendingOrder.status == "PENDING",
            database.PendingOrder.created_at < threshold,
            database.PendingOrder.reminder_sent_at == None,
        )
        .all()
    )
    import smtplib
    from email.message import EmailMessage
    smtp_server = os.getenv("SMTP_SERVER", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    sent = 0
    if smtp_server and smtp_user and smtp_pass:
        for order in orders:
            try:
                msg = EmailMessage()
                msg["Subject"] = "VBF Tervező – emlékeztető: utalásos megrendelés"
                msg["From"] = smtp_user
                msg["To"] = order.email
                plan_label = "havi" if order.plan_type == "monthly" else "éves"
                msg.set_content(
                    f"Kedves {order.customer_name}!\n\n"
                    f"Emlékeztetünk: a {plan_label} előfizetésed ({order.amount_huf} Ft) utalását még nem kaptuk meg.\n\n"
                    "Ha már utaltál, kérjük vedd fel velünk a kapcsolatot. Ha még nem, kérjük a számla szerinti adatok alapján végezd az utalást.\n\n"
                    "Üdvözlettel,\nA VBF Csapat"
                )
                with smtplib.SMTP(smtp_server, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
                order.reminder_sent_at = datetime.utcnow()
                sent += 1
            except Exception:
                pass
    db.commit()
    return {"ok": True, "reminders_sent": sent, "orders_found": len(orders)}


# ─── Előfizetési csomagok (ár, tartalom – csak super admin) ───
@router.get("/api/admin/plans", response_model=List[schemas.SubscriptionPlanResponse])
def list_plans(db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_super_admin)):
    """Összes csomag: ár, limitek, tartalom (hozzáférések)."""
    plans = db.query(database.SubscriptionPlan).order_by(database.SubscriptionPlan.sort_order).all()
    return plans


@router.put("/api/admin/plans/{plan_key}", response_model=schemas.SubscriptionPlanResponse)
def update_plan(
    plan_key: str,
    payload: schemas.SubscriptionPlanUpdate,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    """Csomag szerkesztése: megjelenített név, árak, jegyzőkönyv/felhasználó limit, tartalom lista."""
    plan = db.query(database.SubscriptionPlan).filter(database.SubscriptionPlan.plan_key == plan_key.upper()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Csomag nem található.")
    if payload.display_name is not None:
        plan.display_name = payload.display_name
    if payload.price_monthly is not None:
        plan.price_monthly = payload.price_monthly
    if payload.price_yearly is not None:
        plan.price_yearly = payload.price_yearly
    if payload.reports_per_month_limit is not None:
        plan.reports_per_month_limit = payload.reports_per_month_limit
    if payload.max_users is not None:
        plan.max_users = payload.max_users
    if payload.features is not None:
        plan.features = payload.features
    if payload.sort_order is not None:
        plan.sort_order = payload.sort_order
    db.commit()
    db.refresh(plan)
    return plan


# ─── Cégek (csak super admin) ───
@router.get("/api/admin/companies", response_model=List[schemas.CompanyResponse])
def list_companies(db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_super_admin)):
    return db.query(database.Company).order_by(database.Company.name).all()


@router.post("/api/admin/companies", response_model=schemas.CompanyResponse)
def create_company(
    payload: schemas.CompanyCreate,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    free_plan = db.query(database.SubscriptionPlan).filter(database.SubscriptionPlan.plan_key == "FREE").first()
    reports_limit = free_plan.reports_per_month_limit if free_plan else database.PLAN_DEFAULTS.get("FREE", {}).get("reports_per_month")
    users_limit = free_plan.max_users if free_plan else database.PLAN_DEFAULTS.get("FREE", {}).get("max_users")
    company = database.Company(
        name=payload.name.strip(),
        plan="FREE",
        reports_per_month_limit=reports_limit,
        max_users=users_limit,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.put("/api/admin/companies/{company_id}", response_model=schemas.CompanyResponse)
def update_company(
    company_id: int,
    payload: schemas.CompanyUpdate,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_super_admin),
):
    """Főadmin: cég neve, csomag és limitek módosítása (pl. Pro frissítés)."""
    company = db.query(database.Company).filter(database.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Cég nem található.")
    if payload.name is not None:
        company.name = payload.name.strip()
    if payload.plan is not None:
        company.plan = payload.plan.upper() if payload.plan else "FREE"
    if payload.reports_per_month_limit is not None:
        company.reports_per_month_limit = payload.reports_per_month_limit
    if payload.max_users is not None:
        company.max_users = payload.max_users
    db.commit()
    db.refresh(company)
    return company


@router.get("/api/admin/users", response_model=List[schemas.UserResponse])
def admin_get_users(db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    from sqlalchemy.orm import joinedload
    users = _admin_user_scope_query(db, current_admin).options(joinedload(database.User.company)).all()
    return [_user_response(db, u) for u in users]


@router.post("/api/admin/users", response_model=schemas.UserResponse)
def admin_create_user(
    user_req: schemas.UserCreate,
    role: str = "TECH",
    company_id: Optional[int] = Query(None),
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_admin),
):
    auth.validate_password_policy(user_req.password)
    db_user = auth.get_user(db, username=user_req.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    role = role.upper()
    company = None
    if _is_super_admin(current_admin):
        # Super admin: bármilyen szerepkör és cég
        if role == "COMPANY_ADMIN" or role == "TECH":
            if company_id is None:
                raise HTTPException(status_code=400, detail="Céges vezető és villanyszerelő esetén cég megadása kötelező.")
            company = db.query(database.Company).filter(database.Company.id == company_id).first()
            if not company:
                raise HTTPException(status_code=404, detail="Cég nem található.")
        else:
            company_id = None  # SUPER_ADMIN/ADMIN nincs céghez kötve
    else:
        # Céges vezető: csak TECH, és csak a saját cégébe
        if role not in ("TECH", "COMPANY_ADMIN"):
            raise HTTPException(status_code=403, detail="Csak villanyszerelőt vagy céges vezetőt hozhatsz létre.")
        company_id = current_admin.company_id
        if not company_id:
            raise HTTPException(status_code=403, detail="A céged nincs beállítva.")
        company = db.query(database.Company).filter(database.Company.id == company_id).first()

    # SaaS: max_users limit cégenként (subscription_plans vagy company override)
    if company:
        _, max_users = database.get_effective_plan_limits(db, company)
        if max_users is not None:
            user_count = db.query(database.User).filter(
                database.User.company_id == company.id,
                database.User.deleted_at == None,
            ).count()
            if user_count >= max_users:
                raise HTTPException(
                    status_code=403,
                    detail=f"Elérted a cégenkénti felhasználó limitet ({max_users} fő). Frissíts előfizetést.",
                )

    hashed_password = auth.get_password_hash(user_req.password)
    new_user = database.User(
        username=user_req.username,
        email=user_req.email,
        hashed_password=hashed_password,
        role=role,
        is_active=True,
        company_id=company_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.refresh(new_user, ["company"])
    return _user_response(db, new_user)


@router.put("/api/admin/users/{user_id}", response_model=schemas.UserResponse)
def admin_update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_admin),
):
    db_user = _admin_user_scope_query(db, current_admin).filter(database.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Céges vezető nem adhat SUPER_ADMIN/ADMIN szerepkört, és nem változtathat company_id-t
    if not _is_super_admin(current_admin):
        update_data = user_update.model_dump(exclude_unset=True)
        if update_data.get("role") in ("SUPER_ADMIN", "ADMIN"):
            raise HTTPException(status_code=403, detail="Nincs jogosultságod ehhez a szerepkörhöz.")
        update_data.pop("company_id", None)
    else:
        update_data = user_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user, ["company"])
    return _user_response(db, db_user)


@router.delete("/api/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_admin),
):
    db_user = _admin_user_scope_query(db, current_admin).filter(database.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.deleted_at = datetime.utcnow()
    db_user.is_active = False
    db.commit()
    db.refresh(db_user)
    return {"message": "User deactivated and marked as deleted."}

def _get_or_create_company_settings(db: Session, current_admin: database.User):
    """Céges vezető: céghez tartozó beállítások; super admin: owner_id alapján (legacy)."""
    if current_admin.company_id:
        settings = db.query(database.CompanySettings).filter(
            database.CompanySettings.company_id == current_admin.company_id
        ).first()
        if not settings:
            settings = database.CompanySettings(company_id=current_admin.company_id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings
    settings = db.query(database.CompanySettings).filter(
        database.CompanySettings.owner_id == current_admin.id
    ).first()
    if not settings:
        settings = database.CompanySettings(owner_id=current_admin.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/api/admin/company", response_model=schemas.CompanySettingsResponse)
def get_company_settings(db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    return _get_or_create_company_settings(db, current_admin)


@router.put("/api/admin/company", response_model=schemas.CompanySettingsResponse)
def update_company_settings(settings_update: schemas.CompanySettingsUpdate, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    settings = _get_or_create_company_settings(db, current_admin)
    update_data = settings_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings

@router.post("/api/admin/company/logo")
def upload_company_logo(file: UploadFile = File(...), db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    from PIL import Image
    import io

    os.makedirs("data/logos", exist_ok=True)
    sid = current_admin.company_id or current_admin.id
    filename = f"logo_{sid}.webp"
    file_path = f"data/logos/{filename}"
    try:
        image_data = file.file.read()
        image = Image.open(io.BytesIO(image_data))
        image.thumbnail((500, 500))
        image.save(file_path, "WEBP", quality=80, method=4)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Hiba a kép feldolgozásakor: {str(e)}")
    settings = _get_or_create_company_settings(db, current_admin)
    settings.logo_path = file_path
    db.commit()
    return {"message": "Logo feltöltve és tömörítve!", "logo_path": file_path}


@router.post("/api/admin/company/signature")
def upload_company_signature(
    file: UploadFile = File(...),
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_admin),
):
    """Digitális aláírás kép feltöltése (megjelenik a generált DOCX/PDF-ben)."""
    from PIL import Image
    import io

    os.makedirs("data/signatures", exist_ok=True)
    sid = current_admin.company_id or current_admin.id
    filename = f"signature_{sid}.webp"
    file_path = f"data/signatures/{filename}"
    try:
        image_data = file.file.read()
        image = Image.open(io.BytesIO(image_data))
        # Aláírás általában vízszintes, max szélesség megőrzése
        w, h = image.size
        if w > 400:
            image = image.resize((400, int(400 * h / w)))
        image.save(file_path, "WEBP", quality=85, method=4)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Hiba az aláírás kép feldolgozásakor: {str(e)}")
    settings = _get_or_create_company_settings(db, current_admin)
    settings.signature_path = file_path
    db.commit()
    return {"message": "Digitális aláírás feltöltve!", "signature_path": file_path}


@router.post("/api/admin/company/cert")
def upload_company_cert(
    file: UploadFile = File(...),
    db: Session = Depends(auth.get_db),
    current_admin: database.User = Depends(auth.get_current_admin),
):
    """Hitelesítő tanúsítvány (.pfx / .p12) feltöltése – ezzel aláírja a rendszer a PDF-et."""
    fn = (file.filename or "").lower()
    if not fn.endswith(".pfx") and not fn.endswith(".p12"):
        raise HTTPException(
            status_code=400,
            detail="Csak .pfx vagy .p12 fájl tölthető fel.",
        )
    os.makedirs("data/signatures", exist_ok=True)
    sid = current_admin.company_id or current_admin.id
    file_path = f"data/signatures/cert_{sid}.pfx"
    try:
        content = file.file.read()
        if len(content) < 100:
            raise HTTPException(status_code=400, detail="A fájl túl kicsi, nem érvényes tanúsítvány.")
        with open(file_path, "wb") as f:
            f.write(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Hiba a fájl mentésekor: {str(e)}")
    settings = _get_or_create_company_settings(db, current_admin)
    settings.pfx_path = file_path
    db.commit()
    return {"message": "Hitelesítő tanúsítvány feltöltve. A PDF aláíráshoz állítsd be a VBF_PFX_PASSWORD környezeti változót.", "pfx_path": file_path}
