from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
        email=user_req.email,
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

@router.get("/api/admin/company", response_model=schemas.CompanySettingsResponse)
def get_company_settings(db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    settings = db.query(database.CompanySettings).filter(database.CompanySettings.owner_id == current_admin.id).first()
    if not settings:
        settings = database.CompanySettings(owner_id=current_admin.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/api/admin/company", response_model=schemas.CompanySettingsResponse)
def update_company_settings(settings_update: schemas.CompanySettingsUpdate, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    settings = db.query(database.CompanySettings).filter(database.CompanySettings.owner_id == current_admin.id).first()
    if not settings:
        settings = database.CompanySettings(owner_id=current_admin.id)
        db.add(settings)
    
    update_data = settings_update.dict(exclude_unset=True)
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
    filename = f"logo_{current_admin.id}.webp"
    file_path = f"data/logos/{filename}"
    
    # Read image into memory and compress using Pillow
    try:
        image_data = file.file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB (in case of RGBA/PNG) to save as WebP properly if needed, although WebP supports alpha.
        # Resize if logo is excessively large (max 500x500 for documents is plenty)
        image.thumbnail((500, 500))
        
        # Save compressed to webp
        image.save(file_path, "WEBP", quality=80, method=4)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Hiba a kép feldolgozásakor: {str(e)}")
        
    settings = db.query(database.CompanySettings).filter(database.CompanySettings.owner_id == current_admin.id).first()
    if not settings:
        settings = database.CompanySettings(owner_id=current_admin.id, logo_path=file_path)
        db.add(settings)
    else:
        settings.logo_path = file_path
    
    db.commit()
    return {"message": "Logo feltöltve és tömörítve!", "logo_path": file_path}

