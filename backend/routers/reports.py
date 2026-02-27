from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import smtplib
from email.message import EmailMessage
import schemas, auth, database, generator
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/api/reports", response_model=List[schemas.ReportResponse])
def get_reports(skip: int = 0, limit: int = 100, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    reports = db.query(database.Report).filter(database.Report.owner_id == current_user.id).offset(skip).limit(limit).all()
    return reports

@router.post("/api/reports", response_model=schemas.ReportResponse)
def create_report(report: schemas.ReportCreate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    # Check Report Limit (e.g for monthly plans)
    if current_user.report_limit > -1:
        # Calculate how many reports created this month
        current_date = datetime.utcnow()
        first_day_of_month = datetime(current_date.year, current_date.month, 1)
        
        report_count = db.query(database.Report).filter(
            database.Report.owner_id == current_user.id,
            database.Report.created_at >= first_day_of_month
        ).count()
        
        if report_count >= current_user.report_limit:
            raise HTTPException(status_code=403, detail="Elérted a havi jegyzőkönyv limitet (15 db). Válts éves prémium előfizetésre!")

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

def _sync_relational_data(report_id: int, diagram_data: dict, measurements_data: dict, db: Session):
    """
    Syncs the hierarchical site tree and measurements into relational tables.
    This ensures data stability and allows for complex SQL queries.
    """
    try:
        # 1. Sync Site Nodes from diagram_data (site_tree)
        # Assuming diagram_data contains the tree structure produced by sitetree.js
        # Actually, sitetree.js data is usually a nested list.
        tree_data = diagram_data.get("site_tree", []) if isinstance(diagram_data, dict) else []
        
        # Clear existing nodes for this report (Cascade is not used for String IDs usually, so manual cleanup)
        # Note: In a production V2, we might want to do partial updates, but full sync is safer for now.
        db.query(database.SiteNode).filter(database.SiteNode.report_id == report_id).delete()
        
        def save_nodes_recursive(nodes, parent_id=None):
            for n in nodes:
                db_node = database.SiteNode(
                    id=n.get("id"),
                    report_id=report_id,
                    parent_id=parent_id,
                    type=n.get("type"),
                    name=n.get("name"),
                    device=n.get("device"),
                    collapsed=n.get("collapsed", False)
                )
                db.add(db_node)
                if n.get("children"):
                    save_nodes_recursive(n.get("children"), db_node.id)

        save_nodes_recursive(tree_data)
        db.flush() # Ensure nodes are in DB before adding measurements

        # 2. Sync Measurements
        # Clear old measurements
        node_ids_subquery = db.query(database.SiteNode.id).filter(database.SiteNode.report_id == report_id).subquery()
        db.query(database.RpeMeasurement).filter(database.RpeMeasurement.node_id.in_(node_ids_subquery)).delete(synchronize_session=False)
        db.query(database.LoopMeasurement).filter(database.LoopMeasurement.node_id.in_(node_ids_subquery)).delete(synchronize_session=False)
        db.query(database.RcdMeasurement).filter(database.RcdMeasurement.node_id.in_(node_ids_subquery)).delete(synchronize_session=False)
        db.query(database.InsulationMeasurement).filter(database.InsulationMeasurement.node_id.in_(node_ids_subquery)).delete(synchronize_session=False)

        # Process each measurement type from measurements_data
        if isinstance(measurements_data, dict):
            # RPE
            for m in measurements_data.get("table-rpe", []):
                if m.get("node_id"):
                    db.add(database.RpeMeasurement(
                        node_id=m["node_id"],
                        point=m.get("point"),
                        location=m.get("loc"),
                        val=m.get("val"),
                        pass_status=m.get("pass", "Igen")
                    ))
            
            # Loop (Zs)
            for m in measurements_data.get("table-loop", []):
                if m.get("node_id"):
                    db.add(database.LoopMeasurement(
                        node_id=m["node_id"],
                        circuit=m.get("circuit"),
                        device=m.get("device"),
                        location=m.get("loc"),
                        zs=m.get("zs"),
                        pass_status=m.get("pass", "Igen")
                    ))

            # RCD
            for m in measurements_data.get("table-rcd", []):
                if m.get("node_id"):
                    db.add(database.RcdMeasurement(
                        node_id=m["node_id"],
                        circuit=m.get("circ"),
                        type=m.get("type", "A"),
                        idn=m.get("idn"),
                        test_05=m.get("05"),
                        t1=m.get("t1"),
                        t5=m.get("t5"),
                        ramp=m.get("ramp"),
                        uc=m.get("uc"),
                        pass_status=m.get("pass", "Igen")
                    ))

            # Insulation (Riso)
            for m in measurements_data.get("table-insulation", []):
                if m.get("node_id"):
                    db.add(database.InsulationMeasurement(
                        node_id=m["node_id"],
                        circuit=m.get("circuit"),
                        ln=m.get("ln"),
                        lpe=m.get("lpe"),
                        npe=m.get("npe"),
                        pass_status=m.get("pass", "Igen")
                    ))

        db.commit()
        print(f"[Sync] Relational data synced for report {report_id}")
    except Exception as e:
        db.rollback()
        print(f"[Sync Error] Failed to sync relational data: {e}")

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

    # Trigger relational sync
    _sync_relational_data(
        report_id=db_report.id, 
        diagram_data=db_report.diagram_data, 
        measurements_data=db_report.measurements_data, 
        db=db
    )

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
        
    stream = generator.generate_docx_stream(report, db)
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
        stream = generator.generate_signed_pdf_stream(report, db)
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
        
    doc_stream = generator.generate_docx_stream(db_report, db)
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

