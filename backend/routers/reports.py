from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from starlette.requests import Request
import os
import re
import sys
import io
import zipfile
import secrets

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import smtplib
from email.message import EmailMessage
import schemas, auth, database, generator
from fastapi.responses import StreamingResponse
from security import rate_limit

router = APIRouter()


def _reports_scope(db, current_user):
    """TECH: saját; COMPANY_ADMIN: cégé; SUPER_ADMIN/ADMIN: minden."""
    if current_user.role in ("SUPER_ADMIN", "ADMIN"):
        return db.query(database.Report)
    if current_user.role == "COMPANY_ADMIN" and current_user.company_id:
        return db.query(database.Report).join(database.User, database.Report.owner_id == database.User.id).filter(
            database.User.company_id == current_user.company_id
        )
    return db.query(database.Report).filter(database.Report.owner_id == current_user.id)


@router.get("/api/reports", response_model=List[schemas.ReportResponse])
def get_reports(skip: int = 0, limit: int = 100, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    skip = max(0, min(skip, 10000))
    limit = max(1, min(limit, 500))
    reports = _reports_scope(db, current_user).offset(skip).limit(limit).all()
    return reports

def _company_reports_limit(db: Session, company_id: int):
    """Cég havi report limitje: company override, subscription_plans, vagy PLAN_DEFAULTS."""
    company = db.query(database.Company).filter(database.Company.id == company_id).first()
    if not company:
        return None
    reports_limit, _ = database.get_effective_plan_limits(db, company)
    return reports_limit


@router.post("/api/reports", response_model=schemas.ReportResponse)
def create_report(report: schemas.ReportCreate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    # SaaS: cégenkénti havi limit (vagy user.report_limit ha nincs cég)
    current_date = datetime.utcnow()
    first_day_of_month = datetime(current_date.year, current_date.month, 1)

    if current_user.company_id:
        limit = _company_reports_limit(db, current_user.company_id)
        if limit is not None:
            from sqlalchemy import and_
            report_count = db.query(database.Report).join(database.User, database.Report.owner_id == database.User.id).filter(
                database.User.company_id == current_user.company_id,
                database.Report.created_at >= first_day_of_month,
            ).count()
            if report_count >= limit:
                raise HTTPException(
                    status_code=403,
                    detail=f"Elérted a havi jegyzőkönyv limitet ({limit} db). Frissíts előfizetést az Admin felületen.",
                )
    elif getattr(current_user, "report_limit", None) is not None and current_user.report_limit > -1:
        report_count = db.query(database.Report).filter(
            database.Report.owner_id == current_user.id,
            database.Report.created_at >= first_day_of_month,
        ).count()
        if report_count >= current_user.report_limit:
            raise HTTPException(status_code=403, detail="Elérted a havi jegyzőkönyv limitet. Válts prémium előfizetésre!")

    db_report = database.Report(**report.dict(), owner_id=current_user.id)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def get_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    report = db.query(database.Report).filter(database.Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if current_user.role in ("SUPER_ADMIN", "ADMIN"):
        pass
    elif current_user.role == "COMPANY_ADMIN" and current_user.company_id:
        owner = db.query(database.User).filter(database.User.id == report.owner_id).first()
        if not owner or owner.company_id != current_user.company_id:
            raise HTTPException(status_code=404, detail="Report not found")
    elif report.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        _log_report_audit(db, report_id, current_user.id, "opened")
    except Exception:
        pass
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
    try:
        _log_report_audit(db, report_id, current_user.id, "finalized")
    except Exception:
        pass
    return db_report

from fastapi.responses import StreamingResponse
import generator

@router.get("/api/reports/{report_id}/export/docx")
def export_report_docx(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        _log_report_audit(db, report_id, current_user.id, "exported_docx")
    except Exception:
        pass

    share_url = None
    if report.status == "FINAL":
        share_row = db.query(database.ReportShareToken).filter(database.ReportShareToken.report_id == report_id).first()
        if not share_row:
            share_row = database.ReportShareToken(report_id=report_id, token=secrets.token_urlsafe(32), expires_at=None)
            db.add(share_row)
            db.commit()
            db.refresh(share_row)
        base_url = os.environ.get("BACKEND_URL", "http://localhost:8002")
        share_url = f"{base_url.rstrip('/')}/api/public/report/{share_row.token}?format=docx"

    stream = generator.generate_docx_stream(report, db, share_url=share_url)
    rep_type = report.report_type.upper() if report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    year = report.created_at.year if report.created_at else datetime.utcnow().year
    c_data = getattr(report, "client_data", None) or {}
    if not isinstance(c_data, dict):
        c_data = {}
    customer = (c_data.get("customerName") or c_data.get("siteAddress") or "").strip()
    safe = re.sub(r"[^\w\s\-]", "", customer)
    safe = re.sub(r"\s+", "_", safe).strip("_")[:35] if customer else ""
    filename = f"{short_rep_type}-{year}-{report.id:03d}_{safe}.docx" if safe else f"{short_rep_type}-{year}-{report.id:03d}.docx"
    
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
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        _log_report_audit(db, report_id, current_user.id, "exported_pdf")
    except Exception:
        pass

    share_url = None
    if report.status == "FINAL":
        share_row = db.query(database.ReportShareToken).filter(database.ReportShareToken.report_id == report_id).first()
        if not share_row:
            share_row = database.ReportShareToken(report_id=report_id, token=secrets.token_urlsafe(32), expires_at=None)
            db.add(share_row)
            db.commit()
            db.refresh(share_row)
        base_url = os.environ.get("BACKEND_URL", "http://localhost:8002")
        share_url = f"{base_url.rstrip('/')}/api/public/report/{share_row.token}?format=pdf"

    try:
        stream = generator.generate_signed_pdf_stream(report, db, share_url=share_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    rep_type = report.report_type.upper() if report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    year = report.created_at.year if report.created_at else datetime.utcnow().year
    c_data = getattr(report, "client_data", None) or {}
    if not isinstance(c_data, dict):
        c_data = {}
    customer = (c_data.get("customerName") or c_data.get("siteAddress") or "").strip()
    safe = re.sub(r"[^\w\s\-]", "", customer)
    safe = re.sub(r"\s+", "_", safe).strip("_")[:35] if customer else ""
    filename = f"{short_rep_type}-{year}-{report.id:03d}_{safe}.pdf" if safe else f"{short_rep_type}-{year}-{report.id:03d}.pdf"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }
    return StreamingResponse(
        content=stream, 
        media_type="application/pdf", 
        headers=headers
    )


@router.get("/api/reports/{report_id}/export/diagram-pdf")
def export_report_diagram_pdf(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Egyoldalas A4 PDF csak az egyvonalas rajz képből (aláíratlan)."""
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    try:
        _log_report_audit(db, report_id, current_user.id, "exported_diagram_pdf")
    except Exception:
        pass
    try:
        stream = generator.generate_diagram_pdf_stream(report)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    rep_type = report.report_type.upper() if report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    year = report.created_at.year if report.created_at else datetime.utcnow().year
    c_data = getattr(report, "client_data", None) or {}
    if not isinstance(c_data, dict):
        c_data = {}
    customer = (c_data.get("customerName") or c_data.get("siteAddress") or "").strip()
    safe = re.sub(r"[^\w\s\-]", "", customer)
    safe = re.sub(r"\s+", "_", safe).strip("_")[:35] if customer else ""
    filename = f"{short_rep_type}-{year}-{report.id:03d}_rajz.pdf" if not safe else f"{short_rep_type}-{year}-{report.id:03d}_{safe}_rajz.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return StreamingResponse(content=stream, media_type="application/pdf", headers=headers)


@router.get("/api/reports/{report_id}/audit-log", response_model=List[schemas.ReportAuditLogEntry])
def get_report_audit_log(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Jegyzőkönyv audit napló (5.2): megnyitás, export, finalize – csak jogosult user/cég admin."""
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    rows = (
        db.query(database.ReportAuditLog, database.User.username)
        .outerjoin(database.User, database.ReportAuditLog.user_id == database.User.id)
        .filter(database.ReportAuditLog.report_id == report_id)
        .order_by(database.ReportAuditLog.created_at.desc())
        .all()
    )
    return [
        schemas.ReportAuditLogEntry(
            id=e.id,
            report_id=e.report_id,
            user_id=e.user_id,
            action=e.action,
            meta=e.meta,
            created_at=e.created_at,
            username=username,
        )
        for e, username in rows
    ]


@router.delete("/api/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = db.query(database.Report).filter(database.Report.id == report_id, database.Report.owner_id == current_user.id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(db_report)
    db.commit()
    return {"message": "Report successfully deleted"}


def _report_access(db, report_id: int, current_user: database.User):
    """Return report if user has access, else None."""
    report = db.query(database.Report).filter(database.Report.id == report_id).first()
    if not report:
        return None
    if current_user.role in ("SUPER_ADMIN", "ADMIN"):
        return report
    if current_user.role == "COMPANY_ADMIN" and current_user.company_id:
        owner = db.query(database.User).filter(database.User.id == report.owner_id).first()
        if owner and owner.company_id == current_user.company_id:
            return report
    if report.owner_id == current_user.id:
        return report
    return None


def _log_report_audit(db: Session, report_id: int, user_id: int, action: str, meta: dict = None):
    """Audit napló bejegyzés (5.2). opened: max 1 / user / report / nap."""
    if action == "opened":
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        exists = db.query(database.ReportAuditLog).filter(
            database.ReportAuditLog.report_id == report_id,
            database.ReportAuditLog.user_id == user_id,
            database.ReportAuditLog.action == "opened",
            database.ReportAuditLog.created_at >= today_start,
        ).first()
        if exists:
            return
    entry = database.ReportAuditLog(report_id=report_id, user_id=user_id, action=action, meta=meta)
    db.add(entry)
    db.commit()


@router.post("/api/reports/{report_id}/clone", response_model=schemas.ReportResponse)
def clone_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Meglévő jegyzőkönyvből másolat készítése (DRAFT státuszban)."""
    source = _report_access(db, report_id, current_user)
    if not source:
        raise HTTPException(status_code=404, detail="Report not found")

    # Havi limit ellenőrzés
    current_date = datetime.utcnow()
    first_day_of_month = datetime(current_date.year, current_date.month, 1)
    if current_user.company_id:
        limit = _company_reports_limit(db, current_user.company_id)
        if limit is not None:
            from sqlalchemy import and_
            report_count = db.query(database.Report).join(database.User, database.Report.owner_id == database.User.id).filter(
                database.User.company_id == current_user.company_id,
                database.Report.created_at >= first_day_of_month,
            ).count()
            if report_count >= limit:
                raise HTTPException(status_code=403, detail=f"Elérted a havi jegyzőkönyv limitet ({limit} db).")
    elif getattr(current_user, "report_limit", None) is not None and current_user.report_limit > -1:
        report_count = db.query(database.Report).filter(
            database.Report.owner_id == current_user.id,
            database.Report.created_at >= first_day_of_month,
        ).count()
        if report_count >= current_user.report_limit:
            raise HTTPException(status_code=403, detail="Elérted a havi jegyzőkönyv limitet.")

    new_title = f"[Másolat] {(source.title or 'Jegyzőkönyv')}"
    clone_data = {
        "title": new_title,
        "report_type": source.report_type or "vbf_idoszakos",
        "client_data": source.client_data,
        "diagram_data": source.diagram_data,
        "diagram_image": source.diagram_image,
        "defects_data": source.defects_data,
        "measurements_data": source.measurements_data,
    }
    db_clone = database.Report(**clone_data, owner_id=current_user.id, status="DRAFT")
    db.add(db_clone)
    db.commit()
    db.refresh(db_clone)

    _sync_relational_data(db_clone.id, db_clone.diagram_data, db_clone.measurements_data, db)
    return db_clone


@router.post("/api/reports/export-zip")
def export_reports_zip(body: schemas.ReportExportZipRequest, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Több jegyzőkönyv exportálása egy ZIP fájlba (DOCX formátumban)."""
    if not body.report_ids or len(body.report_ids) > 50:
        raise HTTPException(status_code=400, detail="1–50 jegyzőkönyv megadása szükséges.")
    if any(not isinstance(rid, int) or rid <= 0 or rid >= 2**31 for rid in body.report_ids):
        raise HTTPException(status_code=400, detail="Érvénytelen report_id érték.")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for rid in body.report_ids:
            report = _report_access(db, rid, current_user)
            if not report:
                continue
            stream = generator.generate_docx_stream(report, db)
            rep_type = report.report_type.upper() if report.report_type else "VBF"
            short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
            year = report.created_at.year if report.created_at else datetime.utcnow().year
            safe_title = "".join(c for c in (report.title or "") if c.isalnum() or c in " ._-").strip() or f"report_{rid}"
            filename = f"{short_rep_type}-{year}-{report.id:03d}_{safe_title}.docx"
            zf.writestr(filename, stream.getvalue())

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="jegyzokonyvek.zip"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post("/api/reports/{report_id}/share", response_model=schemas.ReportShareResponse)
def create_report_share(report_id: int, expires_days: int = 30, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Megosztási link létrehozása – read-only hozzáférés a jegyzőkönyvhöz."""
    report = _report_access(db, report_id, current_user)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.status != "FINAL":
        raise HTTPException(status_code=400, detail="Csak véglegesített jegyzőkönyv osztható meg.")

    # Létező token törlése (1 report = 1 aktív link)
    db.query(database.ReportShareToken).filter(database.ReportShareToken.report_id == report_id).delete()

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=expires_days) if expires_days > 0 else None
    share_row = database.ReportShareToken(report_id=report_id, token=token, expires_at=expires_at)
    db.add(share_row)
    db.commit()

    base_url = os.environ.get("BACKEND_URL", "http://localhost:8002")
    share_url = f"{base_url.rstrip('/')}/api/public/report/{token}"

    return schemas.ReportShareResponse(share_url=share_url, token=token, expires_at=expires_at)


@router.delete("/api/reports/{report_id}/share")
def revoke_report_share(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Megosztási link visszavonása."""
    report = _report_access(db, report_id, current_user)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.query(database.ReportShareToken).filter(database.ReportShareToken.report_id == report_id).delete()
    db.commit()
    return {"message": "Megosztási link visszavonva."}


def _measurement_templates_scope(db, current_user: database.User):
    """Céges vagy user saját mérési sablonok lekérdezése."""
    q = db.query(database.MeasurementTemplate)
    if current_user.role in ("SUPER_ADMIN", "ADMIN"):
        return q
    if current_user.company_id:
        return q.filter(database.MeasurementTemplate.company_id == current_user.company_id)
    return q.filter(database.MeasurementTemplate.owner_id == current_user.id)


@router.get("/api/measurement-templates", response_model=List[schemas.MeasurementTemplateResponse])
def list_measurement_templates(db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Céges / user egyedi mérési sablonok listája."""
    return _measurement_templates_scope(db, current_user).order_by(database.MeasurementTemplate.created_at.desc()).all()


@router.post("/api/measurement-templates", response_model=schemas.MeasurementTemplateResponse)
def create_measurement_template(body: schemas.MeasurementTemplateCreate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Új mérési sablon létrehozása (céges vagy user saját)."""
    t = database.MeasurementTemplate(
        name=body.name,
        template_json=body.template_json,
        company_id=current_user.company_id if current_user.company_id else None,
        owner_id=current_user.id if not current_user.company_id else None,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/api/measurement-templates/{template_id}", response_model=schemas.MeasurementTemplateResponse)
def update_measurement_template(template_id: int, body: schemas.MeasurementTemplateUpdate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Mérési sablon módosítása."""
    t = db.query(database.MeasurementTemplate).filter(database.MeasurementTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Sablon nem található.")
    if current_user.role not in ("SUPER_ADMIN", "ADMIN"):
        if current_user.company_id and t.company_id != current_user.company_id:
            raise HTTPException(status_code=404, detail="Sablon nem található.")
        if not current_user.company_id and t.owner_id != current_user.id:
            raise HTTPException(status_code=404, detail="Sablon nem található.")
    if body.name is not None:
        t.name = body.name
    if body.template_json is not None:
        t.template_json = body.template_json
    db.commit()
    db.refresh(t)
    return t


@router.delete("/api/measurement-templates/{template_id}")
def delete_measurement_template(template_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Mérési sablon törlése."""
    t = db.query(database.MeasurementTemplate).filter(database.MeasurementTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Sablon nem található.")
    if current_user.role not in ("SUPER_ADMIN", "ADMIN"):
        if current_user.company_id and t.company_id != current_user.company_id:
            raise HTTPException(status_code=404, detail="Sablon nem található.")
        if not current_user.company_id and t.owner_id != current_user.id:
            raise HTTPException(status_code=404, detail="Sablon nem található.")
    db.delete(t)
    db.commit()
    return {"message": "Sablon törölve."}


@router.post("/api/reports/import", response_model=schemas.ReportResponse)
def import_report(body: schemas.ReportImportRequest, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Jegyzőkönyv importálása JSON adatokból (mentés visszaállítás, más rendszerből)."""
    current_date = datetime.utcnow()
    first_day_of_month = datetime(current_date.year, current_date.month, 1)
    if current_user.company_id:
        limit = _company_reports_limit(db, current_user.company_id)
        if limit is not None:
            report_count = db.query(database.Report).join(database.User, database.Report.owner_id == database.User.id).filter(
                database.User.company_id == current_user.company_id,
                database.Report.created_at >= first_day_of_month,
            ).count()
            if report_count >= limit:
                raise HTTPException(status_code=403, detail=f"Elérted a havi jegyzőkönyv limitet ({limit} db).")
    elif getattr(current_user, "report_limit", None) is not None and current_user.report_limit > -1:
        report_count = db.query(database.Report).filter(
            database.Report.owner_id == current_user.id,
            database.Report.created_at >= first_day_of_month,
        ).count()
        if report_count >= current_user.report_limit:
            raise HTTPException(status_code=403, detail="Elérted a havi jegyzőkönyv limitet.")

    meas = body.measurements_data
    if isinstance(meas, list):
        meas = {"rpe": meas, "loop": [], "rcd": [], "insulation": []}

    db_report = database.Report(
        title=body.title,
        report_type=body.report_type,
        client_data=body.client_data,
        diagram_data=body.diagram_data,
        diagram_image=body.diagram_image,
        defects_data=body.defects_data,
        measurements_data=meas,
        owner_id=current_user.id,
        status="DRAFT",
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    _sync_relational_data(db_report.id, db_report.diagram_data, db_report.measurements_data, db)
    return db_report


@router.get("/api/public/report/{token}")
@rate_limit("public_report", limit=60, window_seconds=60)
async def get_public_report(request: Request, token: str, format: str = "json", db: Session = Depends(auth.get_db)):
    """Publikus read-only hozzáférés jegyzőkönyvhöz token alapján. ?format=docx|pdf|json. Rate limit: 60/perc/IP."""
    share_row = db.query(database.ReportShareToken).filter(database.ReportShareToken.token == token).first()
    if not share_row:
        raise HTTPException(status_code=404, detail="Érvénytelen vagy lejárt megosztási link.")

    if share_row.expires_at and share_row.expires_at < datetime.utcnow():
        db.delete(share_row)
        db.commit()
        raise HTTPException(status_code=404, detail="A megosztási link lejárt.")

    report = db.query(database.Report).filter(database.Report.id == share_row.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")

    c_data = getattr(report, "client_data", None) or {}
    if not isinstance(c_data, dict):
        c_data = {}
    customer = (c_data.get("customerName") or c_data.get("siteAddress") or "").strip()
    safe = re.sub(r"[^\w\s\-]", "", customer)
    safe = re.sub(r"\s+", "_", safe).strip("_")[:35] if customer else ""
    rep_type = report.report_type.upper() if report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    year = report.created_at.year if report.created_at else datetime.utcnow().year
    fn_base = f"{short_rep_type}-{year}-{report.id:03d}_{safe}" if safe else f"{short_rep_type}-{year}-{report.id:03d}"

    if format == "docx":
        base_url = os.environ.get("BACKEND_URL", "http://localhost:8002")
        share_url = f"{base_url.rstrip('/')}/api/public/report/{token}?format=docx"
        stream = generator.generate_docx_stream(report, db, share_url=share_url)
        return StreamingResponse(
            stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{fn_base}.docx"'}
        )
    if format == "pdf":
        base_url = os.environ.get("BACKEND_URL", "http://localhost:8002")
        pdf_share_url = f"{base_url.rstrip('/')}/api/public/report/{token}?format=pdf"
        try:
            stream = generator.generate_signed_pdf_stream(report, db, share_url=pdf_share_url)
            return StreamingResponse(
                stream,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{fn_base}.pdf"'}
            )
        except Exception:
            stream = generator.generate_docx_stream(report, db, share_url=pdf_share_url)
            return StreamingResponse(
                stream,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": f'attachment; filename="{fn_base}.docx"'}
            )

    # format == "json" (default): read-only adatok
    return {
        "id": report.id,
        "title": report.title,
        "report_type": report.report_type,
        "status": report.status,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "finalized_at": report.finalized_at.isoformat() if report.finalized_at else None,
        "export_docx_url": f"/api/public/report/{token}?format=docx",
        "export_pdf_url": f"/api/public/report/{token}?format=pdf",
    }


@router.post("/api/reports/{report_id}/email")
def send_report_email(report_id: int, email_data: schemas.EmailRequest, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = db.query(database.Report).filter(database.Report.id == report_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    if current_user.role in ("SUPER_ADMIN", "ADMIN"):
        pass
    elif current_user.role == "COMPANY_ADMIN" and current_user.company_id:
        owner = db.query(database.User).filter(database.User.id == db_report.owner_id).first()
        if not owner or owner.company_id != current_user.company_id:
            raise HTTPException(status_code=404, detail="Report not found")
    elif db_report.owner_id != current_user.id:
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

