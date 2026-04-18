from fastapi import APIRouter, Depends, HTTPException, Request, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from datetime import datetime, timedelta
import os
import sys
import io
import zipfile
import secrets

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import smtplib
from email.message import EmailMessage
import schemas, auth, database, generator
from fastapi.responses import StreamingResponse

router = APIRouter()


def _audit(db: Session, user_id: Optional[int], action: str, detail: Optional[str], ip: Optional[str] = None):
    entry = database.AuditLog(user_id=user_id, action=action, detail=detail, ip=ip)
    db.add(entry)
    db.commit()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _reports_scope(db, current_user):
    """TECH: saját + cég megosztott; COMPANY_ADMIN: cégé; SUPER_ADMIN: minden; ADMIN: cég vagy saját."""
    from sqlalchemy import or_
    if current_user.role == "SUPER_ADMIN":
        return db.query(database.Report)
    if current_user.role == "ADMIN":
        if current_user.company_id:
            return db.query(database.Report).join(database.User, database.Report.owner_id == database.User.id).filter(
                database.User.company_id == current_user.company_id
            )
        return db.query(database.Report).filter(database.Report.owner_id == current_user.id)
    if current_user.company_id:
        if current_user.role == "COMPANY_ADMIN":
            return db.query(database.Report).join(database.User, database.Report.owner_id == database.User.id).filter(
                database.User.company_id == current_user.company_id
            )
        else:
            return db.query(database.Report).join(database.User, database.Report.owner_id == database.User.id).filter(
                or_(
                    database.Report.owner_id == current_user.id,
                    (database.Report.company_shared == True) & (database.User.company_id == current_user.company_id)
                )
            )
    return db.query(database.Report).filter(database.Report.owner_id == current_user.id)


@router.get("/api/reports", response_model=List[schemas.ReportResponse])
def get_reports(skip: int = 0, limit: int = 100, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
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
def create_report(report: schemas.ReportCreate, request: Request, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
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
                    detail=f"Elérted a havi jegyzőkönyv limitet ({limit} db). Frissíts előfizetést a cégadmin felületen.",
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
    _audit(db, current_user.id, "report_create", f"id={db_report.id} title={db_report.title!r}", _client_ip(request))
    return db_report

@router.get("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def get_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")
    return report

def _measurements_block(raw: Any) -> dict:
    """Frontend: `[ { rpe, loop, ... } ]` vagy közvetlen dict; relációs sync ugyanabból."""
    if raw is None:
        return {}
    if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], dict):
        return dict(raw[0])
    if isinstance(raw, dict):
        return dict(raw)
    return {}


def _sync_relational_data(report_id: int, diagram_data: Any, measurements_data: Any, db: Session):
    """
    Syncs the hierarchical site tree and measurements into relational tables.
    This ensures data stability and allows for complex SQL queries.
    """
    try:
        if not isinstance(diagram_data, dict):
            diagram_data = {}
        # 1. Sync Site Nodes from diagram_data (site_tree)
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

        md = _measurements_block(measurements_data)

        def _rows(primary: str, fallback: str):
            x = md.get(primary) or md.get(fallback) or []
            return x if isinstance(x, list) else []

        # RPE — table-rpe (régi) vagy rpe (SPA)
        for m in _rows("table-rpe", "rpe"):
            if not isinstance(m, dict) or not m.get("node_id"):
                continue
            db.add(database.RpeMeasurement(
                node_id=m["node_id"],
                point=m.get("point"),
                location=m.get("loc") or m.get("location"),
                val=m.get("val") or m.get("rpeValue"),
                pass_status=m.get("pass", "Igen"),
            ))

        # Loop (Zs)
        for m in _rows("table-loop", "loop"):
            if not isinstance(m, dict) or not m.get("node_id"):
                continue
            db.add(database.LoopMeasurement(
                node_id=m["node_id"],
                circuit=m.get("circuit"),
                device=m.get("device"),
                location=m.get("loc"),
                zs=m.get("zs"),
                pass_status=m.get("pass", "Igen"),
            ))

        # RCD — test05 (frontend) vagy "05" (régi)
        for m in _rows("table-rcd", "rcd"):
            if not isinstance(m, dict) or not m.get("node_id"):
                continue
            db.add(database.RcdMeasurement(
                node_id=m["node_id"],
                circuit=m.get("circ"),
                type=m.get("type", "A"),
                idn=m.get("idn"),
                test_05=m.get("test05") or m.get("05"),
                t1=m.get("t1"),
                t5=m.get("t5"),
                ramp=m.get("ramp"),
                uc=m.get("uc"),
                pass_status=m.get("pass", "Igen"),
            ))

        # Insulation (Riso)
        for m in _rows("table-insulation", "insulation"):
            if not isinstance(m, dict) or not m.get("node_id"):
                continue
            db.add(database.InsulationMeasurement(
                node_id=m["node_id"],
                circuit=m.get("circuit"),
                ln=m.get("ln"),
                lpe=m.get("lpe"),
                npe=m.get("npe"),
                pass_status=m.get("pass", "Igen"),
            ))

        db.commit()
        print(f"[Sync] Relational data synced for report {report_id}")
    except Exception as e:
        db.rollback()
        print(f"[Sync Error] Failed to sync relational data: {e}")

@router.put("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def update_report(report_id: int, updated_report: schemas.ReportUpdate, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = _report_access(db, report_id, current_user)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található vagy nincs jogosultságod.")
    
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

def _create_report_snapshot(db: Session, report: database.Report, user_id: Optional[int], note: Optional[str] = None):
    last = db.query(database.ReportVersion).filter(
        database.ReportVersion.report_id == report.id
    ).order_by(database.ReportVersion.version_num.desc()).first()
    version_num = (last.version_num + 1) if last else 1
    snap = {c.name: getattr(report, c.name) for c in report.__table__.columns}
    # datetime objects → ISO strings for JSON
    for k, v in snap.items():
        if isinstance(v, datetime):
            snap[k] = v.isoformat()
    entry = database.ReportVersion(
        report_id=report.id,
        version_num=version_num,
        created_by=user_id,
        snapshot=snap,
        note=note,
    )
    db.add(entry)
    db.commit()
    return entry


@router.post("/api/reports/{report_id}/finalize", response_model=schemas.ReportResponse)
def finalize_report(report_id: int, request: Request, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = _report_access(db, report_id, current_user)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")

    _create_report_snapshot(db, db_report, current_user.id, note="auto: véglegesítés előtt")

    db_report.status = "FINAL"
    db_report.finalized_at = datetime.utcnow()
    db.commit()
    db.refresh(db_report)
    _audit(db, current_user.id, "report_finalize", f"id={report_id} title={db_report.title!r}", _client_ip(request))
    return db_report

from fastapi.responses import StreamingResponse
import generator

@router.get("/api/reports/{report_id}/export/docx")
def export_report_docx(report_id: int, request: Request, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")
    if report.status == "FINAL":
        raise HTTPException(status_code=403, detail="A véglegesített jegyzőkönyv csak PDF formátumban exportálható. Word (szerkeszthető piszkozat) csak DRAFT státuszú dokumentumoknál érhető el.")

    stream = generator.generate_docx_stream(report, db, share_url=None)
    rep_type = report.report_type.upper() if report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    year = report.created_at.year if report.created_at else datetime.utcnow().year
    
    filename = f"{short_rep_type}-{year}-{report.id:03d}.docx"
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }
    _audit(db, current_user.id, "report_export_docx", f"id={report_id}", _client_ip(request))
    return StreamingResponse(
        content=stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=headers
    )

@router.get("/api/reports/{report_id}/export/pdf")
def export_report_pdf(report_id: int, request: Request, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")

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

    owner = db.query(database.User).filter(database.User.id == report.owner_id).first()
    use_watermark = database.pdf_export_requires_watermark(db, owner)
    try:
        stream = generator.generate_signed_pdf_stream(report, db, share_url=share_url, watermark=use_watermark)
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
    _audit(db, current_user.id, "report_export_pdf", f"id={report_id}", _client_ip(request))
    return StreamingResponse(
        content=stream,
        media_type="application/pdf",
        headers=headers
    )

@router.delete("/api/reports/{report_id}")
def delete_report(report_id: int, request: Request, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = _report_access(db, report_id, current_user)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")
    if db_report.owner_id != current_user.id and current_user.role not in ("SUPER_ADMIN", "ADMIN", "COMPANY_ADMIN"):
        raise HTTPException(status_code=403, detail="Csak a saját jegyzőkönyvedet törölheted.")
    title = db_report.title
    db.delete(db_report)
    db.commit()
    _audit(db, current_user.id, "report_delete", f"id={report_id} title={title!r}", _client_ip(request))
    return {"message": "Report successfully deleted"}


def _report_access(db, report_id: int, current_user: database.User):
    """Return report if user has access, else None."""
    report = db.query(database.Report).filter(database.Report.id == report_id).first()
    if not report:
        return None
    if current_user.role == "SUPER_ADMIN":
        return report
    if current_user.role == "ADMIN":
        if current_user.company_id:
            owner = db.query(database.User).filter(database.User.id == report.owner_id).first()
            if owner and owner.company_id == current_user.company_id:
                return report
            return None
        return report if report.owner_id == current_user.id else None
    if current_user.company_id:
        owner = db.query(database.User).filter(database.User.id == report.owner_id).first()
        if owner and owner.company_id == current_user.company_id:
            if current_user.role == "COMPANY_ADMIN" or report.owner_id == current_user.id or getattr(report, "company_shared", True):
                return report
    if report.owner_id == current_user.id:
        return report
    return None


@router.post("/api/reports/{report_id}/clone", response_model=schemas.ReportResponse)
def clone_report(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Meglévő jegyzőkönyvből másolat készítése (DRAFT státuszban)."""
    source = _report_access(db, report_id, current_user)
    if not source:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")

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
    """Több jegyzőkönyv exportálása egy ZIP fájlba (DOCX formátumban, csak DRAFT státuszú)."""
    if not body.report_ids or len(body.report_ids) > 50:
        raise HTTPException(status_code=400, detail="1–50 jegyzőkönyv megadása szükséges.")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for rid in body.report_ids:
            report = _report_access(db, rid, current_user)
            if not report or report.status == "FINAL":
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
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")

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
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")
    db.query(database.ReportShareToken).filter(database.ReportShareToken.report_id == report_id).delete()
    db.commit()
    return {"message": "Megosztási link visszavonva."}


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
def get_public_report(token: str, format: str = "json", db: Session = Depends(auth.get_db)):
    """Publikus read-only hozzáférés jegyzőkönyvhöz token alapján. ?format=docx|pdf|json"""
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

    if format == "docx":
        raise HTTPException(status_code=403, detail="A véglegesített jegyzőkönyv csak PDF formátumban tölthető le. Használd a ?format=pdf paramétert.")
    if format == "pdf":
        base_url = os.environ.get("BACKEND_URL", "http://localhost:8002")
        pdf_share_url = f"{base_url.rstrip('/')}/api/public/report/{token}?format=pdf"
        owner = db.query(database.User).filter(database.User.id == report.owner_id).first()
        use_watermark = database.pdf_export_requires_watermark(db, owner)
        try:
            stream = generator.generate_signed_pdf_stream(report, db, share_url=pdf_share_url, watermark=use_watermark)
            rep_type = report.report_type.upper() if report.report_type else "VBF"
            short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
            year = report.created_at.year if report.created_at else datetime.utcnow().year
            fn = f"{short_rep_type}-{year}-{report.id:03d}.pdf"
            return StreamingResponse(
                stream,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{fn}"'}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF generálási hiba: {e}")

    # format == "json" (default): read-only adatok (véglegesített = csak PDF)
    return {
        "id": report.id,
        "title": report.title,
        "report_type": report.report_type,
        "status": report.status,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "finalized_at": report.finalized_at.isoformat() if report.finalized_at else None,
        "export_pdf_url": f"/api/public/report/{token}?format=pdf",
    }


@router.post("/api/reports/{report_id}/email")
def send_report_email(report_id: int, email_data: schemas.EmailRequest, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_report = _report_access(db, report_id, current_user)
    if not db_report:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található vagy nincs jogosultságod.")
        
    # DRAFT → DOCX, FINAL → PDF (Word csak piszkozatként)
    if db_report.status == "FINAL":
        doc_stream = generator.generate_signed_pdf_stream(db_report, db, watermark=False)
        maintype, subtype, ext = "application", "pdf", "pdf"
    else:
        doc_stream = generator.generate_docx_stream(db_report, db)
        maintype, subtype, ext = "application", "vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"
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
    
    filename = f"{short_rep_type}-{year}-{db_report.id:03d}_{safe_title}.{ext}"
    msg.add_attachment(doc_bytes, maintype=maintype, subtype=subtype, filename=filename)
    
    if smtp_server and smtp_user and smtp_pass:
        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            return {"message": f"Email sikeresen elküldve a következő címre: {email_data.to_email}!"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Hiba az e-mail küldésekor: {str(e)}")
    else:
        # Mock mode if no SMTP is set
        print(f"--- MOCK EMAIL SEndING ---")
        print(f"TO: {email_data.to_email}")
        print(f"SUBJECT: {email_data.subject}")
        print(f"ATTACHMENT: {filename} ({len(doc_bytes)} bytes)")
        return {"message": "Email sikeresen elküldve! (Szimulált üzemmód SMTP hiányában)"}



# ── Verziókezelés ─────────────────────────────────────────────────────────────

@router.post("/api/reports/{report_id}/snapshot")
def create_snapshot(report_id: int, request: Request, note: Optional[str] = None, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Manuális pillanatkép mentés."""
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")
    entry = _create_report_snapshot(db, report, current_user.id, note=note or "kézi mentés")
    _audit(db, current_user.id, "report_snapshot", f"id={report_id} v={entry.version_num}", _client_ip(request))
    return {"id": entry.id, "version_num": entry.version_num, "note": entry.note, "created_at": entry.created_at.isoformat()}


@router.get("/api/reports/{report_id}/versions")
def list_versions(report_id: int, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Verziónapló listázása (tartalom nélkül)."""
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")
    versions = db.query(database.ReportVersion).filter(
        database.ReportVersion.report_id == report_id
    ).order_by(database.ReportVersion.version_num.desc()).all()
    return [
        {
            "id": v.id,
            "version_num": v.version_num,
            "note": v.note,
            "created_by": v.created_by,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        }
        for v in versions
    ]


@router.post("/api/reports/{report_id}/versions/{version_id}/restore")
def restore_version(report_id: int, version_id: int, request: Request, db: Session = Depends(auth.get_db), current_user: database.User = Depends(auth.get_current_user)):
    """Visszaállítás egy korábbi verzióra (csak DRAFT státuszú jelentésnél)."""
    report = _report_access(db, report_id, current_user)
    if report is None:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")
    if report.status == "FINAL":
        raise HTTPException(status_code=400, detail="Véglegesített jegyzőkönyv nem állítható vissza. Másolatot készíts belőle.")
    version = db.query(database.ReportVersion).filter(
        database.ReportVersion.id == version_id,
        database.ReportVersion.report_id == report_id,
    ).first()
    if version is None:
        raise HTTPException(status_code=404, detail="Verzió nem található.")

    # Snapshot a visszaállítás előtti állapotról
    _create_report_snapshot(db, report, current_user.id, note=f"auto: visszaállítás v{version.version_num} előtt")

    snap = version.snapshot or {}
    SKIP = {"id", "owner_id", "created_at", "updated_at", "finalized_at", "status"}
    for col in report.__table__.columns:
        if col.name in SKIP:
            continue
        if col.name in snap:
            setattr(report, col.name, snap[col.name])
    db.commit()
    db.refresh(report)
    _audit(db, current_user.id, "report_restore", f"id={report_id} from_version={version.version_num}", _client_ip(request))
    return {"message": f"Visszaállítva a(z) {version.version_num}. verzióra.", "report_id": report_id}


# ── Audit log ─────────────────────────────────────────────────────────────────

@router.get("/api/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    db: Session = Depends(auth.get_db),
    current_user: database.User = Depends(auth.get_current_user),
):
    """Audit napló lekérdezés (ADMIN / COMPANY_ADMIN / SUPER_ADMIN)."""
    if current_user.role not in ("SUPER_ADMIN", "ADMIN", "COMPANY_ADMIN"):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod az audit naplóhoz.")
    q = db.query(database.AuditLog)
    if current_user.role == "COMPANY_ADMIN":
        company_user_ids = [
            u.id for u in db.query(database.User).filter(database.User.company_id == current_user.company_id).all()
        ]
        q = q.filter(database.AuditLog.user_id.in_(company_user_ids))
    if user_id is not None:
        q = q.filter(database.AuditLog.user_id == user_id)
    if action:
        q = q.filter(database.AuditLog.action.ilike(f"%{action}%"))
    total = q.count()
    logs = q.order_by(database.AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": l.id,
                "user_id": l.user_id,
                "action": l.action,
                "detail": l.detail,
                "ip": l.ip,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
    }
