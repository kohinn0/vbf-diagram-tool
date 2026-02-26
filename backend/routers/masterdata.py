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


@router.get("/api/inspectors", response_model=List[schemas.InspectorResponse])
def get_inspectors(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    return db.query(database.Inspector).filter(database.Inspector.owner_id == current_user.id).all()

@router.post("/api/inspectors", response_model=schemas.InspectorResponse)
def create_inspector(inspector: schemas.InspectorCreate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_inspector = database.Inspector(**inspector.model_dump(), owner_id=current_user.id)
    db.add(db_inspector)
    db.commit()
    db.refresh(db_inspector)
    return db_inspector

@router.delete("/api/inspectors/{inspector_id}")
def delete_inspector(inspector_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_inspector = db.query(database.Inspector).filter(database.Inspector.id == inspector_id, database.Inspector.owner_id == current_user.id).first()
    if not db_inspector:
        raise HTTPException(status_code=404, detail="Inspector not found")
    db.delete(db_inspector)
    db.commit()
    return {"message": "Inspector deleted"}

