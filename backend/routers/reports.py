from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import schemas, auth, database, generator
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/api/reports", response_model=List[schemas.ReportResponse])
def get_reports(skip: int = 0, limit: int = 100, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    reports = db.query(database.Report).filter(database.Report.owner_id == current_user.id).offset(skip).limit(limit).all()
    return reports

@router.post("/api/reports", response_model=schemas.ReportResponse)
def create_report(report: schemas.ReportCreate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = database.Report(**report.dict(), owner_id=current_user.id)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def get_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.put("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def update_report(report_id: int, updated_report: schemas.ReportUpdate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if db_report.status == "FINAL":
        raise HTTPException(status_code=400, detail="Ez a jegyzőkönyv már le van zárva, nem módosítható!")
    
    update_data = updated_report.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_report, key, value)
        
    db.commit()
    db.refresh(db_report)
    return db_report

@router.post("/api/reports/{report_id}/finalize", response_model=schemas.ReportResponse)
def finalize_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db_report.status = "FINAL"
    db_report.finalized_at = datetime.utcnow()
    db.commit()
    db.refresh(db_report)
    return db_report

from fastapi.responses import StreamingResponse
import generator

@router.get("/api/reports/{report_id}/export/docx")
def export_report_docx(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
        
    stream = generator.generate_docx_stream(report)
    rep_type = report.report_type.upper() if report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    year = report.created_at.year if report.created_at else datetime.utcnow().year
    
    filename = f"{short_rep_type}-{year}-{report.id:03d}.docx"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }
    return StreamingResponse(
        content=stream, 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        headers=headers
    )

@router.get("/api/reports/{report_id}/export/pdf")
def export_report_pdf(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
        
    try:
        stream = generator.generate_signed_pdf_stream(report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    rep_type = report.report_type.upper() if report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    year = report.created_at.year if report.created_at else datetime.utcnow().year
    
    filename = f"{short_rep_type}-{year}-{report.id:03d}.pdf"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }
    return StreamingResponse(
        content=stream, 
        media_type="application/pdf", 
        headers=headers
    )

@router.delete("/api/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(db_report)
    db.commit()
    return {"message": "Report successfully deleted"}

@router.post("/api/reports/{report_id}/email")
def send_report_email(report_id: int, email_data: schemas.EmailRequest, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    doc_stream = generator.generate_docx_stream(db_report)
    doc_bytes = doc_stream.getvalue()
    
    # Send Email settings
    smtp_server = os.getenv("SMTP_SERVER", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    
    msg = EmailMessage()
    msg['Subject'] = email_data.subject
    msg['From'] = smtp_user or "noreply@vbf-rendszer.hu"
    msg['To'] = email_data.to_email
    msg.set_content(email_data.body)
    
    safe_title = "".join(c for c in db_report.title if c.isalnum() or c in " ._-").strip()
    if not safe_title:
        safe_title = "JegyzoKonyv"
        
    rep_type = db_report.report_type.upper() if db_report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    year = db_report.created_at.year if db_report.created_at else datetime.utcnow().year
    
    filename = f"{short_rep_type}-{year}-{db_report.id:03d}_{safe_title}.docx"
    
    msg.add_attachment(doc_bytes, maintype='application', subtype='vnd.openxmlformats-officedocument.wordprocessingml.document', filename=filename)
    
    if smtp_server and smtp_user and smtp_pass:
        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            return {"message": f"Email sikeresen elküldve a következő címre: {email_data.to_email}!"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Hiba az email küldésekor: {str(e)}")
    else:
        # Mock mode if no SMTP is set
        print(f"--- MOCK EMAIL SEndING ---")
        print(f"TO: {email_data.to_email}")
        print(f"SUBJECT: {email_data.subject}")
        print(f"ATTACHMENT: {filename} ({len(doc_bytes)} bytes)")
        return {"message": "Email sikeresen elküldve! (Szimulált üzemmód SMTP hiányában)"}

