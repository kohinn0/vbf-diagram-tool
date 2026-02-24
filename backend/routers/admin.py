from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import schemas, auth, database, generator
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/api/admin/users", response_model=List[schemas.UserResponse])
def admin_get_users(db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    return db.query(database.User).all()

@router.post("/api/admin/users", response_model=schemas.UserResponse)
def admin_create_user(user_req: schemas.UserCreate, role: str = "TECH", db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    db_user = auth.get_user(db, username=user_req.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user_req.password)
    new_user = database.User(
        username=user_req.username,
        hashed_password=hashed_password,
        role=role.upper(),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/api/admin/users/{user_id}", response_model=schemas.UserResponse)
def admin_update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    db_user = db.query(database.User).filter(database.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    db_user = db.query(database.User).filter(database.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # GDPR soft delete implementation to preserve relational integrity (reports, jobs)
    db_user.deleted_at = datetime.utcnow()
    db_user.is_active = False
    
    db.commit()
    db.refresh(db_user)
    return {"message": "User deactivated and marked as deleted."}

