from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import schemas, auth, database, generator
from fastapi.responses import StreamingResponse


router = APIRouter()



def _jobs_scope(db, current_user):
    """SUPER_ADMIN/ADMIN: minden; COMPANY_ADMIN: cég felhasználóinak feladatai; TECH: saját."""
    if current_user.role in ("SUPER_ADMIN", "ADMIN"):
        return db.query(database.Job)
    if current_user.role == "COMPANY_ADMIN" and current_user.company_id:
        return (
            db.query(database.Job)
            .join(database.User, database.Job.assigned_to_id == database.User.id)
            .filter(database.User.company_id == current_user.company_id)
        )
    return db.query(database.Job).filter(database.Job.assigned_to_id == current_user.id)


@router.get("/api/jobs", response_model=List[schemas.JobResponse])
def get_jobs(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Get jobs. Super admin: all; company admin: company's; tech: own assigned."""
    return _jobs_scope(db, current_user).all()

import smtplib
from email.message import EmailMessage
from email.utils import formatdate
import uuid

@router.post("/api/admin/jobs", response_model=schemas.JobResponse)
def create_job(job: schemas.JobCreate, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    """Admin/céges vezető creates a new job. Céges vezető csak saját cég felhasználóját assignolhatja."""
    if current_admin.role == "COMPANY_ADMIN" and current_admin.company_id and job.assigned_to_id:
        assignee = db.query(database.User).filter(database.User.id == job.assigned_to_id).first()
        if not assignee or assignee.company_id != current_admin.company_id:
            raise HTTPException(status_code=403, detail="Csak a saját cég felhasználója adható meg.")
    db_job = database.Job(**job.model_dump(), created_by_id=current_admin.id)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    # Email küldése naptár meghívóval (ICS formátum Google naptárhoz)
    assigned_user = db.query(database.User).filter(database.User.id == db_job.assigned_to_id).first()
    
    if assigned_user and assigned_user.email:
        smtp_server = os.getenv("SMTP_SERVER", "")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASS", "")

        if smtp_server and smtp_user and smtp_pass:
            dt_start = db_job.scheduled_date or datetime.utcnow()
            dt_end = dt_start + timedelta(hours=2) # Default 2 hours duration
            
            # Format datetime for ICS format: YYYYMMDDTHHMMSSZ
            dtstart_format = dt_start.strftime("%Y%m%dT%H%M%SZ")
            dtend_format = dt_end.strftime("%Y%m%dT%H%M%SZ")
            dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
            uid = str(uuid.uuid4())
            
            ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//VBF Tool//SaaS//HU
METHOD:REQUEST
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{dtstamp}
DTSTART:{dtstart_format}
DTEND:{dtend_format}
SUMMARY:VBF Munka: {db_job.title}
DESCRIPTION:{db_job.description} (Cím: {db_job.address})
LOCATION:{db_job.address}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR"""

            msg = EmailMessage()
            msg['Subject'] = f"Új VBF Feladat Kiszállás: {db_job.title}"
            msg['From'] = smtp_user
            msg['To'] = assigned_user.email
            msg.set_content(f"Kedves {assigned_user.username}!\n\nÚj feladatot osztottak ki számodra.\nCím: {db_job.title}\nHelyszín: {db_job.address}\nRészletek: {db_job.description}\n\nA csatolt naptáreseményt hozzáadhatod a Google Naptáradhoz.")
            
            msg.add_attachment(ics_content.encode('utf-8'), maintype='text', subtype='calendar', params={'method': 'REQUEST', 'name': 'invite.ics'})

            try:
                with smtplib.SMTP(smtp_server, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
            except Exception as e:
                print(f"SMTP hiba feladat kiosztásakor: {e}")

    return db_job

def _admin_job_scope(db, current_admin, job_id: int):
    """Céges vezető csak a saját cégéhez tartozó feladatot módosíthatja."""
    db_job = db.query(database.Job).filter(database.Job.id == job_id).first()
    if not db_job:
        return None
    if current_admin.role in ("SUPER_ADMIN", "ADMIN"):
        return db_job
    if current_admin.role == "COMPANY_ADMIN" and current_admin.company_id:
        assignee = db.query(database.User).filter(database.User.id == db_job.assigned_to_id).first()
        if assignee and assignee.company_id == current_admin.company_id:
            return db_job
    return None


@router.put("/api/admin/jobs/{job_id}", response_model=schemas.JobResponse)
def update_job(job_id: int, job_update: schemas.JobUpdate, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    """Admin/céges vezető updates job details."""
    db_job = _admin_job_scope(db, current_admin, job_id)
    if not db_job:
        raise HTTPException(status_code=404, detail="A feladat nem található.")
    
    update_data = job_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_job, key, value)
    
    db.commit()
    db.refresh(db_job)
    return db_job

@router.delete("/api/admin/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    """Admin/céges vezető deletes a job."""
    db_job = _admin_job_scope(db, current_admin, job_id)
    if not db_job:
        raise HTTPException(status_code=404, detail="A feladat nem található.")
    db.delete(db_job)
    db.commit()
    return {"message": "Job deleted"}

@router.put("/api/jobs/{job_id}/status", response_model=schemas.JobResponse)
def update_job_status(job_id: int, status: str, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Tech updates the status of their assigned job."""
    db_job = db.query(database.Job).filter(database.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="A feladat nem található.")
    
    # Check permissions: saját feladat, vagy admin/céges vezető a cég feladatához
    if current_user.role in ("SUPER_ADMIN", "ADMIN"):
        pass
    elif current_user.role == "COMPANY_ADMIN" and current_user.company_id:
        assignee = db.query(database.User).filter(database.User.id == db_job.assigned_to_id).first()
        if not assignee or assignee.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="Nincs jogosultságod ehhez a feladathoz.")
    elif db_job.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod ehhez a feladathoz.")
        
    db_job.status = status
    db.commit()
    db.refresh(db_job)
    db.refresh(db_job)
    return db_job


