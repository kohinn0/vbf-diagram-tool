import os
import re
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import SessionLocal, User

# Élesben kötelező: SECRET_KEY és JWT_EXPIRE_MINUTES env (pl. 1440 = 1 nap)
_raw_secret = os.getenv("SECRET_KEY")
_env = os.getenv("ENV", "").lower()
if not _raw_secret:
    # Dev fallback: csak nem‑prod környezetben engedélyezzük a gyenge defaultot
    if _env in ("production", "prod") and os.getenv("TESTING") != "1":
        raise RuntimeError("SECRET_KEY nincs beállítva. Prod környezetben kötelező erős SECRET_KEY‑t megadni env‑ben.")
    _raw_secret = "super-secret-vbf-key-change-in-production"
SECRET_KEY = _raw_secret
ALGORITHM = "HS256"
_access_expire = os.getenv("JWT_EXPIRE_MINUTES", "")
ACCESS_TOKEN_EXPIRE_MINUTES = int(_access_expire) if _access_expire.isdigit() else (60 * 24 * 7)  # default 7 nap (dev)

# Jelszó policy: min 8 karakter, legalább 1 nagybetű, 1 kisbetű, 1 szám vagy speciális
PASSWORD_MIN_LEN = 8
PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).+$")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def validate_password_policy(password: str) -> None:
    """Erős jelszó követelmény. Ha nem megfelelő, HTTPException."""
    if len(password) < PASSWORD_MIN_LEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A jelszónak legalább {PASSWORD_MIN_LEN} karakter hosszúnak kell lennie.",
        )
    if not PASSWORD_REGEX.match(password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A jelszónak tartalmaznia kell legalább egy nagybetűt, egy kisbetűt és egy számot vagy speciális karaktert.",
        )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="A bejelentkezés lejárt vagy érvénytelen. Jelentkezz be újra.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = get_user(db, username=username)
    if user is None or user.deleted_at:
        raise credentials_exception
        
    # Check subscription (super admin és céges vezető is mentes)
    if user.role not in ("SUPER_ADMIN", "ADMIN", "COMPANY_ADMIN") and user.subscription_expires:
        if datetime.utcnow() > user.subscription_expires:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Az előfizetésed lejárt. Frissítsd a hozzáférésedet!"
            )
            
    return user

def _is_super_admin(user: User) -> bool:
    return user.role in ("SUPER_ADMIN", "ADMIN")


def get_current_admin(current_user: User = Depends(get_current_user)):
    """Céges vezető (COMPANY_ADMIN) vagy super admin (SUPER_ADMIN/ADMIN) használhatja az admin API-t."""
    if current_user.role not in ("SUPER_ADMIN", "ADMIN", "COMPANY_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Adminisztrátori jogosultság szükséges!",
        )
    return current_user


def get_current_super_admin(current_user: User = Depends(get_current_user)):
    """Csak super admin: minden felhasználó/cég kezelése, új super admin/cég létrehozása."""
    if not _is_super_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Csak főadminisztrátor jogosultság szükséges!",
        )
    return current_user
