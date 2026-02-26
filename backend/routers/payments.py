import os
import sys
import json
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import schemas, auth, database

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_fake")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_fake")

class CheckoutRequest(BaseModel):
    plan: str = "yearly" # 'monthly' or 'yearly'

@router.post("/api/payments/create-checkout-session")
def create_checkout_session(request: Request, body: CheckoutRequest):
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
    
    if body.plan == "monthly":
        name = 'Villamos Biztonsági Felülvizsgáló (VBF) Tervező - Havi Előfizetés'
        desc = 'Maximum 15 jegyzőkönyv generálása havonta. Alap funkciók.'
        amount = 1299000 # 12,990 HUF
    else:
        name = 'Villamos Biztonsági Felülvizsgáló (VBF) Tervező - 1 Éves Előfizetés'
        desc = 'Minden funkció elérése 1 éven át. Korlátlan technikus hozzáadása és jegyzőkönyv generálás.'
        amount = 9900000 # 99,000 HUF
        
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'huf',
                    'product_data': {
                        'name': name,
                        'description': desc,
                    },
                    'unit_amount': amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=domain_url + '/app.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=domain_url + '/index.html',
            metadata={'plan_type': body.plan}
        )
        return {"id": session.id, "url": session.url}
    except Exception as e:
        print(f"Checkout error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/payments/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(auth.get_db)):
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        if STRIPE_WEBHOOK_SECRET == "whsec_fake":
            # For local testing without real signature validation
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
        else:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
    except Exception as e:
        print(f"Webhook signature verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_email = session.get('customer_details', {}).get('email')
        
        if customer_email:
            # Check if user exists based on email
            db_user = db.query(database.User).filter(database.User.email == customer_email).first()
            
            plan_type = session.get('metadata', {}).get('plan_type', 'yearly')
            
            if plan_type == 'monthly':
                new_sub_expiry = datetime.utcnow() + timedelta(days=31)
                max_reports = 15
            else:
                new_sub_expiry = datetime.utcnow() + timedelta(days=365)
                max_reports = -1 # -1 for unlimited
            
            if db_user:
                # Extend subscription
                db_user.subscription_expires = new_sub_expiry
                db_user.report_limit = max_reports # Use setting in database or logic
                db.commit()
            else:
                # Create a new user with generated credentials
                import string, random
                temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
                hashed_password = auth.get_password_hash(temp_password)
                
                # Base username from email
                base_username = customer_email.split('@')[0]
                username = base_username
                
                # Ensure username uniqueness
                counter = 1
                while db.query(database.User).filter(database.User.username == username).first():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                new_user = database.User(
                    username=username,
                    email=customer_email,
                    hashed_password=hashed_password,
                    role="ADMIN",
                    is_active=True, # Active immediately
                    subscription_expires=new_sub_expiry,
                    report_limit=max_reports
                )
                db.add(new_user)
                db.commit()
                
                # Send email with credentials using existing SMTP configuration
                import smtplib
                from email.message import EmailMessage
                
                smtp_server = os.getenv("SMTP_SERVER", "")
                smtp_port = int(os.getenv("SMTP_PORT", "587"))
                smtp_user = os.getenv("SMTP_USER", "")
                smtp_pass = os.getenv("SMTP_PASS", "")

                if smtp_server and smtp_user and smtp_pass:
                    msg = EmailMessage()
                    msg['Subject'] = "Sikeres Rendelés: VBF Tervező Hozzáférés"
                    msg['From'] = smtp_user
                    msg['To'] = customer_email
                    content = f"Kedves Felhasználó!\n\nSikeresen megrendelted az 1 éves VBF tervező előfizetést.\nAz adminisztrátori fiókodhoz tartozó belépési adatok (amivel villanyszerelőket és technikusokat vehetsz fel):\n\nFelhasználónév: {username}\nJelszó: {temp_password}\n\nKérjük, biztonsági okokból első belépés után módosítsd a jelszavad egy tetszőleges kóddal!\n\nÜdvözlettel,\nA VBF Csapat"
                    msg.set_content(content)

                    try:
                        with smtplib.SMTP(smtp_server, smtp_port) as server:
                            server.starttls()
                            server.login(smtp_user, smtp_pass)
                            server.send_message(msg)
                    except Exception as e:
                        print(f"SMTP Error during account creation email delivery: {e}")

    return {"status": "success"}
