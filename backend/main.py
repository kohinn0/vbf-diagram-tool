from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import smtplib
from email.message import EmailMessage
import zipfile
import tempfile
import sqlite3
import base64

import schemas, auth, database

app = FastAPI(title="VBF Készítő API", description="Jegyzőkönyv és rajz kezelő rendszer", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth Endpoints ---
@app.post("/api/register", response_model=schemas.UserResponse)
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

@app.delete("/api/users/me")
def delete_my_account(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    # GDPR: Hard delete including reports
    db.query(database.Report).filter(database.Report.owner_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "Sikeres törlés (GDPR compliance)"}

@app.post("/api/login", response_model=schemas.Token)
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

@app.get("/api/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: database.User = Depends(auth.get_current_user)):
    return current_user


# --- Reports Endpoints ---
@app.get("/api/reports", response_model=List[schemas.ReportResponse])
def get_reports(skip: int = 0, limit: int = 100, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    reports = db.query(database.Report).filter(database.Report.owner_id == current_user.id).offset(skip).limit(limit).all()
    return reports

@app.post("/api/reports", response_model=schemas.ReportResponse)
def create_report(report: schemas.ReportCreate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = database.Report(**report.dict(), owner_id=current_user.id)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@app.get("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def get_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@app.put("/api/reports/{report_id}", response_model=schemas.ReportResponse)
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

@app.post("/api/reports/{report_id}/finalize", response_model=schemas.ReportResponse)
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

@app.get("/api/reports/{report_id}/export/docx")
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

@app.get("/api/reports/{report_id}/export/pdf")
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

@app.delete("/api/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(db_report)
    db.commit()
    return {"message": "Report successfully deleted"}

@app.post("/api/reports/{report_id}/email")
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

# --- Admin Endpoints ---
@app.get("/api/admin/users", response_model=List[schemas.UserResponse])
def admin_get_users(db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    return db.query(database.User).all()

@app.put("/api/admin/users/{user_id}", response_model=schemas.UserResponse)
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

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    db_user = db.query(database.User).filter(database.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted"}

# --- Master Data Endpoints (Customers) ---
@app.get("/api/customers", response_model=List[schemas.CustomerResponse])
def get_customers(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    return db.query(database.Customer).filter(database.Customer.owner_id == current_user.id).all()

@app.post("/api/customers", response_model=schemas.CustomerResponse)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_customer = database.Customer(**customer.model_dump(), owner_id=current_user.id)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_customer = db.query(database.Customer).filter(database.Customer.id == customer_id, database.Customer.owner_id == current_user.id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(db_customer)
    db.commit()
    return {"message": "Customer deleted"}

# --- Master Data Endpoints (Inspectors) ---
@app.get("/api/inspectors", response_model=List[schemas.InspectorResponse])
def get_inspectors(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    return db.query(database.Inspector).filter(database.Inspector.owner_id == current_user.id).all()

@app.post("/api/inspectors", response_model=schemas.InspectorResponse)
def create_inspector(inspector: schemas.InspectorCreate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_inspector = database.Inspector(**inspector.model_dump(), owner_id=current_user.id)
    db.add(db_inspector)
    db.commit()
    db.refresh(db_inspector)
    return db_inspector

@app.delete("/api/inspectors/{inspector_id}")
def delete_inspector(inspector_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_inspector = db.query(database.Inspector).filter(database.Inspector.id == inspector_id, database.Inspector.owner_id == current_user.id).first()
    if not db_inspector:
        raise HTTPException(status_code=404, detail="Inspector not found")
    db.delete(db_inspector)
    db.commit()
    return {"message": "Inspector deleted"}

# --- CRM / Job Management Endpoints ---

@app.get("/api/jobs", response_model=List[schemas.JobResponse])
def get_jobs(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Get jobs. Admins see all, Techs see only their assigned ones."""
    if current_user.role == "ADMIN":
        return db.query(database.Job).all()
    else:
        return db.query(database.Job).filter(database.Job.assigned_to_id == current_user.id).all()

@app.post("/api/admin/jobs", response_model=schemas.JobResponse)
def create_job(job: schemas.JobCreate, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    """Admin creates a new job/task."""
    db_job = database.Job(**job.model_dump(), created_by_id=current_admin.id)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@app.put("/api/admin/jobs/{job_id}", response_model=schemas.JobResponse)
def update_job(job_id: int, job_update: schemas.JobUpdate, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    """Admin updates job details."""
    db_job = db.query(database.Job).filter(database.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = job_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_job, key, value)
    
    db.commit()
    db.refresh(db_job)
    return db_job

@app.delete("/api/admin/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    """Admin deletes a job."""
    db_job = db.query(database.Job).filter(database.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(db_job)
    db.commit()
    return {"message": "Job deleted"}

@app.put("/api/jobs/{job_id}/status", response_model=schemas.JobResponse)
def update_job_status(job_id: int, status: str, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Tech updates the status of their assigned job."""
    db_job = db.query(database.Job).filter(database.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check permissions
    if current_user.role != "ADMIN" and db_job.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")
        
    db_job.status = status
    db.commit()
    db.refresh(db_job)
    db.refresh(db_job)
    return db_job

@app.post("/api/padfx/parse")
async def parse_padfx_file(
    file: UploadFile = File(...)
):
    with tempfile.TemporaryDirectory() as temp_dir:
        input_file = os.path.join(temp_dir, file.filename)
        # Read file contents
        content = await file.read()
        with open(input_file, "wb") as f:
            f.write(content)

        padf_path = None
        # Check if it's a zip file
        if zipfile.is_zipfile(input_file):
            try:
                with zipfile.ZipFile(input_file, 'r') as zf:
                    zf.extractall(temp_dir)
                padf_path = os.path.join(temp_dir, "DataSource.padf")
                if not os.path.exists(padf_path):
                    # Try to find any .padf or .padfx or .xml / .sqlite
                    for root, dirs, files in os.walk(temp_dir):
                        for f in files:
                            if f.endswith((".padf", ".sqlite", ".db", ".xml")):
                                padf_path = os.path.join(root, f)
                                break
            except Exception as e:
                return {"status": "error", "message": f"Hiba a kicsomagolás során: {str(e)}"}
        else:
            padf_path = input_file

        if not padf_path or not os.path.exists(padf_path):
            return {"status": "error", "message": "Nem találtam a (DataSource.padf vagy XML) adatbázist a fájlban!"}

        try:
            # Try to connect and list tables
            conn = sqlite3.connect(padf_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [r[0] for r in cursor.fetchall()]
            
            schema = {}
            data_sample = {}
            for table_name in tables:
                cursor.execute(f"PRAGMA table_info('{table_name}')")
                schema[table_name] = [r[1] for r in cursor.fetchall()]
                try:
                    cursor.execute(f"SELECT * FROM '{table_name}' LIMIT 5")
                    data_sample[table_name] = cursor.fetchall()
                except Exception:
                    pass
                    
            conn.close()
            return {"status": "success", "schema": schema, "data_sample": data_sample, "is_sqlite": True}
        except sqlite3.DatabaseError:
            # Parse XML
            try:
                import xml.etree.ElementTree as ET
                tree = ET.parse(padf_path)
                root = tree.getroot()
                
                measurements = []
                for so in root.findall('.//SO'):
                    node_name = so.find('N').text if so.find('N') is not None else "Unknown"
                    for m in so.findall('.//M'):
                        mid_elem = m.find('.//MID')
                        mid = mid_elem.text if mid_elem is not None else "Unknown"
                        
                        m_date = ""
                        m_params = {}
                        for mp in m.findall('.//MP'):
                            val = mp.find('V').text if mp.find('V') is not None else ""
                            mp_id = mp.attrib.get('Id', '')
                            if mp_id == '1':
                                m_date = val
                            else:
                                m_params[f"p_{mp_id}"] = val
                                
                        m_results = {}
                        for rs in m.findall('.//R'):
                            val = rs.find('V').text if rs.find('V') is not None else ""
                            rs_id = rs.attrib.get('Id', '')
                            m_results[f"r_{rs_id}"] = val
                            
                        # Extract some human readable types based on MID
                        m_type = "Ismeretlen"
                        if mid == "20": m_type = "Rpe Folytonosság"
                        elif mid in ["16", "17", "111"]: m_type = "Zs Hurokellenállás"
                        elif mid in ["11", "12", "14"]: m_type = "RCD (FI-relé)"
                        elif mid == "22": m_type = "Riso Szigetelés"

                        measurements.append({
                            "mid": mid,
                            "type": m_type,
                            "location": node_name,
                            "date": m_date,
                            "params": m_params,
                            "results": m_results
                        })
                        
                return {"status": "success", "is_sqlite": False, "measurements": measurements}
            except Exception as e:
                 return {"status": "error", "message": f"Nem olvasható XML fájl! {str(e)}"}
