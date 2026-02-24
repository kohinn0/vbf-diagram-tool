from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import schemas, auth, database, generator
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.post("/api/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(auth.get_db)):
    db_user = auth.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    
    # First user is admin (bootstrapping)
    is_first = db.query(database.User).count() == 0
    sub_expiry = datetime.utcnow() + timedelta(days=365) if is_first else None
    
    db_user = database.User(
        username=user.username, 
        hashed_password=hashed_password, 
        role="ADMIN" if is_first else "TECH",
        subscription_expires=sub_expiry
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/api/users/me")
def delete_my_account(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    # GDPR: Hard delete including reports
    db.query(database.Report).filter(database.Report.owner_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "Sikeres törlés (GDPR compliance)"}

@router.post("/api/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    user = auth.get_user(db, form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/api/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: database.User = Depends(auth.get_current_user)):
    return current_user


