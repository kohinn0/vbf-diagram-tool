from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import schemas, auth, database, generator
from fastapi.responses import StreamingResponse
from security import is_locked, record_failure, record_success

router = APIRouter()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _audit(db: Session, user_id: Optional[int], action: str, detail: Optional[str], ip: Optional[str]):
    entry = database.AuditLog(user_id=user_id, action=action, detail=detail, ip=ip)
    db.add(entry)
    db.commit()


@router.post("/api/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(auth.get_db)):
    auth.validate_password_policy(user.password)
    is_first = db.query(database.User).count() == 0
    if not is_first:
        raise HTTPException(status_code=403, detail="Public registration is disabled. Administrator must create your account.")
    
    db_user = auth.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    
    # First user is super admin (bootstrapping)
    is_first = db.query(database.User).count() == 0
    sub_expiry = datetime.utcnow() + timedelta(days=365) if is_first else None
    role = "ADMIN" if is_first else "TECH"  # ADMIN = super admin (backward compat)

    db_user = database.User(
        username=user.username,
        hashed_password=hashed_password,
        role=role,
        subscription_expires=sub_expiry,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def _data_url_to_ext(data_url: str) -> str:
    if not data_url or not isinstance(data_url, str) or not data_url.startswith("data:image/"):
        return ".jpg"
    part = data_url.split(";")[0].lower()
    if "png" in part:
        return ".png"
    if "gif" in part:
        return ".gif"
    if "webp" in part:
        return ".webp"
    return ".jpg"


def _data_url_to_bytes(data_url: str):
    if not data_url or "," not in data_url:
        return None
    try:
        b64 = data_url.split(",", 1)[1]
        import base64
        return base64.b64decode(b64)
    except Exception:
        return None


@router.get("/api/users/me/data-export")
def export_my_data(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """
    GDPR 20. cikk – adathordozhatóság: a felhasználó által rendszerünkben tárolt
    személyes és tartalmi adatok géppel olvasható formátumban (JSON).
    """
    db.refresh(current_user, ["company"])
    reports = db.query(database.Report).filter(database.Report.owner_id == current_user.id).all()
    customers = db.query(database.Customer).filter(database.Customer.owner_id == current_user.id).all()
    inspectors = db.query(database.Inspector).filter(database.Inspector.owner_id == current_user.id).all()
    export = {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "profile": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "company_id": current_user.company_id,
            "company_name": current_user.company.name if current_user.company else None,
            "subscription_expires": current_user.subscription_expires.isoformat() if current_user.subscription_expires else None,
        },
        "reports": [
            {"id": r.id, "title": r.title, "report_type": r.report_type, "status": r.status, "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in reports
        ],
        "customers": [{"id": c.id, "name": c.name, "address": c.address} for c in customers],
        "inspectors": [{"id": i.id, "name": i.name, "license": i.license} for i in inspectors],
    }
    from fastapi.responses import JSONResponse
    return JSONResponse(content=export)


@router.get("/api/users/me/data-export-zip")
def export_my_data_zip(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """
    GDPR – teljes adatcsomag (ZIP): minden jegyzőkönyv, fénykép, diagram és egyéb adat
    egy letölthető ZIP-ben. Fiók törlése előtt vagy bármikor kérhető.
    """
    import zipfile
    import json
    import re
    from fastapi.responses import StreamingResponse

    db.refresh(current_user, ["company"])
    reports = db.query(database.Report).filter(database.Report.owner_id == current_user.id).all()
    customers = db.query(database.Customer).filter(database.Customer.owner_id == current_user.id).all()
    inspectors = db.query(database.Inspector).filter(database.Inspector.owner_id == current_user.id).all()

    ts = datetime.utcnow().strftime("%Y-%m-%d_%H%M")
    root = f"vbf_adatexport_{ts}"
    buf = __import__("io").BytesIO()
    zf = zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED)

    def safe_name(s: str) -> str:
        return re.sub(r"[^\w\-\. ]", "_", (s or "")[:80]).strip() or "report"

    # Profil
    profil = {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "company_name": current_user.company.name if current_user.company else None,
        "subscription_expires": current_user.subscription_expires.isoformat() if current_user.subscription_expires else None,
    }
    zf.writestr(f"{root}/profil.json", json.dumps(profil, indent=2, ensure_ascii=False))

    # Ügyfelek, vizsgálók
    zf.writestr(
        f"{root}/ugyfelek.json",
        json.dumps([{"id": c.id, "name": c.name, "address": c.address, "hrsz": c.hrsz, "building_purpose": c.building_purpose} for c in customers], indent=2, ensure_ascii=False),
    )
    zf.writestr(
        f"{root}/vizsgalok.json",
        json.dumps([{"id": i.id, "name": i.name, "license": i.license, "instrument_type": i.instrument_type, "instrument_cal": i.instrument_cal} for i in inspectors], indent=2, ensure_ascii=False),
    )

    for report in reports:
        folder = f"{root}/jegyzokonyvek/report_{report.id}_{safe_name(report.title or '')}"
        # Teljes jegyzőkönyv adat (JSON) – minden mező, képek base64-ben is
        report_dict = {
            "id": report.id,
            "title": report.title,
            "report_type": report.report_type,
            "status": report.status,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "updated_at": report.updated_at.isoformat() if report.updated_at else None,
            "finalized_at": report.finalized_at.isoformat() if report.finalized_at else None,
            "client_data": report.client_data,
            "diagram_data": report.diagram_data,
            "defects_data": report.defects_data,
            "measurements_data": report.measurements_data,
        }
        zf.writestr(f"{folder}/adatok.json", json.dumps(report_dict, indent=2, ensure_ascii=False))

        # Diagram kép (ha van)
        if getattr(report, "diagram_image", None) and str(report.diagram_image).startswith("data:image"):
            raw = _data_url_to_bytes(report.diagram_image)
            if raw:
                zf.writestr(f"{folder}/diagram.png", raw)

        # Hibák fényképei
        defects = report.defects_data or []
        for i, d in enumerate(defects):
            if not isinstance(d, dict):
                continue
            photo = d.get("photo")
            if photo and isinstance(photo, str) and photo.startswith("data:image"):
                raw = _data_url_to_bytes(photo)
                if raw:
                    ext = _data_url_to_ext(photo)
                    zf.writestr(f"{folder}/hibak/{i}{ext}", raw)

        # Mérési fotók (measurements_data különböző listák)
        meas_photo_idx = 0
        meas_data = report.measurements_data or {}
        for m_key in ["rpe", "insulation", "loop", "rcd", "tools", "selv", "eph_cont"]:
            items = meas_data.get(m_key) or []
            if not isinstance(items, list):
                continue
            for m_row in items:
                if not isinstance(m_row, dict):
                    continue
                photo = m_row.get("photo")
                if photo and isinstance(photo, str) and photo.startswith("data:image"):
                    raw = _data_url_to_bytes(photo)
                    if raw:
                        ext = _data_url_to_ext(photo)
                        zf.writestr(f"{folder}/meresek/{meas_photo_idx}{ext}", raw)
                        meas_photo_idx += 1

    zf.close()
    buf.seek(0)
    filename = f"vbf-adatexport-{ts}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/api/users/me")
def delete_my_account(request: Request, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """GDPR 17. cikk – törlés joga: fiók és a hozzá tartozó tartalom törlése; audit napló anonimizálása."""
    # Ne engedjük, hogy az egyetlen SUPER_ADMIN/ADMIN törölje magát (opcionális üzleti szabály)
    if current_user.role in ("SUPER_ADMIN", "ADMIN"):
        admin_count = db.query(database.User).filter(
            database.User.role.in_(["SUPER_ADMIN", "ADMIN"]),
            database.User.deleted_at == None,
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Az egyetlen főadmin fiók nem törölhető ezen a felületen. Kapcsolat az üzemeltetővel.")
    # Audit napló anonimizálása (GDPR: ne maradjon személyes adat)
    db.query(database.AuditLog).filter(database.AuditLog.user_id == current_user.id).update(
        {"user_id": None, "detail": "deleted_user"},
        synchronize_session=False,
    )
    db.commit()
    _audit(db, None, "delete_account", "deleted_user", _client_ip(request))
    db.query(database.Report).filter(database.Report.owner_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "Sikeres törlés (GDPR compliance)"}

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/api/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    ip = _client_ip(request)
    username = (form_data.username or "").strip()
    if is_locked(ip) or is_locked(username):
        _audit(db, None, "login_locked", f"username={username}", ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Túl sok sikertelen bejelentkezési kísérlet. Próbáld újra 15 perc múlva.",
        )
    user = auth.get_user(db, form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        record_failure(ip)
        record_failure(username)
        _audit(db, getattr(user, "id", None), "login_fail", f"username={username}", ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    record_success(ip)
    record_success(username)
    _audit(db, user.id, "login_ok", user.username, ip)
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/api/users/me", response_model=schemas.UserResponse)
def read_users_me(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db.refresh(current_user, ["company"])
    company_name = current_user.company.name if current_user.company else None
    return schemas.UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        role=current_user.role,
        company_id=current_user.company_id,
        company_name=company_name,
        subscription_expires=current_user.subscription_expires,
    )


@router.patch("/api/users/me", response_model=schemas.UserResponse)
def update_my_profile(
    body: schemas.ProfileUpdateRequest,
    db: Session = Depends(auth.get_db),
    current_user: database.User = Depends(auth.get_current_user),
):
    """Saját profil: email módosítása (opcionális)."""
    if body.email is not None:
        email = (body.email or "").strip().lower()
        if email and "@" in email:
            current_user.email = email[:255]
        else:
            current_user.email = None
    db.commit()
    db.refresh(current_user, ["company"])
    company_name = current_user.company.name if current_user.company else None
    return schemas.UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        role=current_user.role,
        company_id=current_user.company_id,
        company_name=company_name,
        subscription_expires=current_user.subscription_expires,
    )


@router.put("/api/users/me/password")
@limiter.limit("5/15minute")
def change_password(
    request: Request,
    body: schemas.PasswordChangeRequest,
    db: Session = Depends(auth.get_db),
    current_user: database.User = Depends(auth.get_current_user),
):
    """
    Jelszó módosítás: régi jelszó ellenőrzése + új jelszó (erős jelszó policy).
    Rate limit: 5 kérés / 15 perc / IP.
    """
    if not auth.verify_password(body.current_password, current_user.hashed_password):
        _audit(db, current_user.id, "password_change_fail", "wrong_current", _client_ip(request))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A jelenlegi jelszó nem megfelelő.")
    auth.validate_password_policy(body.new_password)
    if body.current_password == body.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Az új jelszó legyen különböző a régitől.")
    current_user.hashed_password = auth.get_password_hash(body.new_password)
    db.commit()
    _audit(db, current_user.id, "password_change_ok", None, _client_ip(request))
    return {"message": "Jelszó sikeresen megváltoztatva. A következő belépéskor az új jelszót használd."}


@router.post("/api/request-password-reset")
@limiter.limit("5/15minute")
def request_password_reset(request: Request, body: schemas.RequestPasswordResetRequest, db: Session = Depends(auth.get_db)):
    """
    Elfelejtett jelszó: email alapján token generálás és link küldése (ha van SMTP).
    Rate limit: 5/15 perc. Mindig ugyanaz a válasz (biztonság).
    """
    import secrets
    import hashlib
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        return {"message": "Ha van ilyen fiók, jelszó-visszaállító linket küldtünk az e-mail címedre."}
    user = db.query(database.User).filter(database.User.email == email, database.User.deleted_at == None).first()
    if not user:
        return {"message": "Ha van ilyen fiók, jelszó-visszaállító linket küldtünk az e-mail címedre."}
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=1)
    db.query(database.PasswordResetToken).filter(database.PasswordResetToken.user_id == user.id).delete()
    db.add(database.PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    db.commit()
    base_url = request.headers.get("origin") or request.base_url
    if isinstance(base_url, str) and "api" in base_url:
        base_url = base_url.replace("/api", "").rstrip("/")
    reset_url = f"{base_url}/app.html?reset={raw_token}"
    smtp_server = os.getenv("SMTP_SERVER", "")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    if smtp_server and smtp_user and smtp_pass:
        import smtplib
        from email.message import EmailMessage
        msg = EmailMessage()
        msg["Subject"] = "VBF – Jelszó visszaállítás"
        msg["From"] = smtp_user
        msg["To"] = email
        msg.set_content(
            f"Kedves Felhasználó!\n\n"
            f"Kértél jelszó-visszaállító linket. Kattints az alábbi linkre (1 órán belül érvényes):\n\n{reset_url}\n\n"
            "Ha nem te kérted, hagyd figyelmen kívül ezt az e-mailt.\n\nÜdvözlettel,\nA VBF Csapat"
        )
        try:
            with smtplib.SMTP(smtp_server, int(os.getenv("SMTP_PORT", "587"))) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        except Exception as e:
            import logging
            logging.getLogger("vbf").exception("Jelszó reset email: %s", e)
    return {"message": "Ha van ilyen fiók, jelszó-visszaállító linket küldtünk az e-mail címedre."}


@router.post("/api/reset-password")
@limiter.limit("5/15minute")
def reset_password(request: Request, body: schemas.ResetPasswordRequest, db: Session = Depends(auth.get_db)):
    """Jelszó visszaállítása token alapján (elfelejtett jelszó link)."""
    import hashlib
    auth.validate_password_policy(body.new_password)
    token_hash = hashlib.sha256((body.token or "").encode()).hexdigest()
    row = db.query(database.PasswordResetToken).filter(
        database.PasswordResetToken.token_hash == token_hash,
        database.PasswordResetToken.expires_at > datetime.utcnow(),
    ).first()
    if not row:
        raise HTTPException(status_code=400, detail="A link lejárt vagy érvénytelen. Kérj új linket.")
    user = db.query(database.User).filter(database.User.id == row.user_id).first()
    if not user or user.deleted_at:
        raise HTTPException(status_code=400, detail="A link érvénytelen.")
    user.hashed_password = auth.get_password_hash(body.new_password)
    db.delete(row)
    db.commit()
    _audit(db, user.id, "password_reset_ok", None, _client_ip(request))
    return {"message": "Jelszó sikeresen megváltoztatva. Most már bejelentkezhetsz az új jelszóval."}


@router.post("/api/dev/bootstrap-admin")
def bootstrap_admin(db: Session = Depends(auth.get_db)):
    """
    DEV SEGÍTSÉG: ismert jelszavú admin felhasználó létrehozása / resetelése.
    Ne hagyd így éles környezetben!

    Biztonsági okokból ez az endpoint csak akkor aktív, ha az ENABLE_DEV_BOOTSTRAP_ADMIN=1
    környezeti változó be van állítva. Prod környezetben így nem kihasználható backdoor.
    """
    import os
    if os.getenv("ENABLE_DEV_BOOTSTRAP_ADMIN") != "1":
        # Szándékosan 404-et adunk vissza, hogy ne derüljön ki az endpoint létezése
        raise HTTPException(status_code=404, detail="Not found")
    username = "admin"
    plain_password = "TesztJelszo123"

    user = db.query(database.User).filter(database.User.username == username).first()
    hashed = auth.get_password_hash(plain_password)

    if user:
        user.hashed_password = hashed
        user.role = "ADMIN"
        user.is_active = True
        if not user.subscription_expires:
            user.subscription_expires = datetime.utcnow() + timedelta(days=365)
        db.commit()
        db.refresh(user)
        action = "reset"
    else:
        user = database.User(
            username=username,
            email="admin@example.com",
            hashed_password=hashed,
            role="ADMIN",
            is_active=True,
            subscription_expires=datetime.utcnow() + timedelta(days=365),
            report_limit=-1,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        action = "created"

    return {
        "status": "ok",
        "action": action,
        "username": username,
        "password": plain_password,
        "id": user.id,
    }

