from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import schemas, auth, database, generator
from fastapi.responses import StreamingResponse

router = APIRouter()



@router.get("/api/jobs", response_model=List[schemas.JobResponse])
def get_jobs(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Get jobs. Admins see all, Techs see only their assigned ones."""
    if current_user.role == "ADMIN":
        return db.query(database.Job).all()
    else:
        return db.query(database.Job).filter(database.Job.assigned_to_id == current_user.id).all()

@router.post("/api/admin/jobs", response_model=schemas.JobResponse)
def create_job(job: schemas.JobCreate, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    """Admin creates a new job/task."""
    db_job = database.Job(**job.model_dump(), created_by_id=current_admin.id)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.put("/api/admin/jobs/{job_id}", response_model=schemas.JobResponse)
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

@router.delete("/api/admin/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(auth.get_db), current_admin: database.User = Depends(auth.get_current_admin)):
    """Admin deletes a job."""
    db_job = db.query(database.Job).filter(database.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(db_job)
    db.commit()
    return {"message": "Job deleted"}

@router.put("/api/jobs/{job_id}/status", response_model=schemas.JobResponse)
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

@router.post("/api/padfx/parse")
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
