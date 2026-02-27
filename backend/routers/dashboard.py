"""
Dashboard & Analytics API Router
─────────────────────────────────
Admin-only endpoints for:
  • Report statistics (monthly, by type, by result)
  • Defect analytics (category breakdown, most common)
  • Upcoming inspection reminders (OTSZ-based)
  • Revenue / activity metrics
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, and_
from datetime import datetime, timedelta
import json
import smtplib
import os
import sys
from email.message import EmailMessage
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import auth, database

router = APIRouter()

# ═══════════════════════════════════════════════
# OTSZ Inspection Cycles (years)
# ═══════════════════════════════════════════════
INSPECTION_CYCLES = {
    'AK': 6,   # Alacsony kockázat (lakóépület)
    'KK': 3,   # Közepes kockázat (iroda, bolt)
    'MK': 1,   # Magas kockázat (ipari, kórház)
}


@router.get("/api/dashboard/stats")
async def get_dashboard_stats(
    db: Session = Depends(auth.get_db),
    current_user: database.User = Depends(auth.get_current_user)
):
    """Main dashboard statistics — ADMIN only."""
    if current_user.role != 'ADMIN':
        raise HTTPException(status_code=403, detail="Csak admin felhasználók érhetik el.")

    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Total reports ──
    total_reports = db.query(func.count(database.Report.id)).filter(
        database.Report.owner_id == current_user.id
    ).scalar() or 0

    # ── This month's reports ──
    monthly_reports = db.query(func.count(database.Report.id)).filter(
        database.Report.owner_id == current_user.id,
        database.Report.created_at >= start_of_month
    ).scalar() or 0

    # ── Finalized reports ──
    finalized_reports = db.query(func.count(database.Report.id)).filter(
        database.Report.owner_id == current_user.id,
        database.Report.status == 'FINAL'
    ).scalar() or 0

    # ── Reports by type ──
    type_breakdown = db.query(
        database.Report.report_type,
        func.count(database.Report.id)
    ).filter(
        database.Report.owner_id == current_user.id
    ).group_by(database.Report.report_type).all()

    type_data = {t: c for t, c in type_breakdown}

    # ── Monthly trend (last 12 months) ──
    twelve_months_ago = now - timedelta(days=365)
    monthly_trend_raw = db.query(
        extract('year', database.Report.created_at).label('year'),
        extract('month', database.Report.created_at).label('month'),
        func.count(database.Report.id)
    ).filter(
        database.Report.owner_id == current_user.id,
        database.Report.created_at >= twelve_months_ago
    ).group_by('year', 'month').order_by('year', 'month').all()

    monthly_trend = [
        {"year": int(y), "month": int(m), "count": c}
        for y, m, c in monthly_trend_raw
    ]

    # ── Defect analytics ──
    defect_stats = _analyze_defects(db, current_user.id)

    # ── Result breakdown (MEGFELELT / NEM MEGFELELT) ──
    result_stats = _analyze_results(db, current_user.id)

    # ── Active users count (admin sees all) ──
    active_users = db.query(func.count(database.User.id)).filter(
        database.User.is_active == True,
        database.User.deleted_at == None
    ).scalar() or 0

    # ── Pending jobs ──
    pending_jobs = db.query(func.count(database.Job.id)).filter(
        database.Job.status == 'PENDING'
    ).scalar() or 0

    return {
        "total_reports": total_reports,
        "monthly_reports": monthly_reports,
        "finalized_reports": finalized_reports,
        "draft_reports": total_reports - finalized_reports,
        "type_breakdown": type_data,
        "monthly_trend": monthly_trend,
        "defect_stats": defect_stats,
        "result_stats": result_stats,
        "active_users": active_users,
        "pending_jobs": pending_jobs,
    }


@router.get("/api/dashboard/upcoming-inspections")
async def get_upcoming_inspections(
    days: int = 90,
    db: Session = Depends(auth.get_db),
    current_user: database.User = Depends(auth.get_current_user)
):
    """
    Returns reports whose next inspection date falls within the given window.
    Looks at client_data.nextInspectionDate stored in each report.
    """
    if current_user.role != 'ADMIN':
        raise HTTPException(status_code=403, detail="Csak admin felhasználók érhetik el.")

    now = datetime.utcnow()
    cutoff = now + timedelta(days=days)

    reports = db.query(database.Report).filter(
        database.Report.owner_id == current_user.id,
        database.Report.status == 'FINAL'
    ).all()

    upcoming = []
    overdue = []

    for rep in reports:
        cd = rep.client_data or {}
        next_date_str = cd.get('nextInspectionDate')
        if not next_date_str:
            continue

        try:
            next_date = datetime.strptime(next_date_str, '%Y-%m-%d')
        except (ValueError, TypeError):
            continue

        entry = {
            "report_id": rep.id,
            "title": rep.title,
            "report_type": rep.report_type,
            "site_address": cd.get('siteAddress', ''),
            "customer_name": cd.get('customerName', ''),
            "next_inspection_date": next_date_str,
            "days_until": (next_date - now).days,
            "otsz_class": cd.get('buildingOtsz', 'AK'),
            "inspector_name": cd.get('inspectorName', ''),
        }

        if next_date < now:
            entry["status"] = "LEJÁRT"
            overdue.append(entry)
        elif next_date <= cutoff:
            entry["status"] = "KÖZELGŐ"
            upcoming.append(entry)

    # Sort: overdue first (most overdue), then upcoming (soonest first)
    overdue.sort(key=lambda x: x["days_until"])
    upcoming.sort(key=lambda x: x["days_until"])

    return {
        "overdue": overdue,
        "upcoming": upcoming,
        "total_overdue": len(overdue),
        "total_upcoming": len(upcoming),
    }


@router.post("/api/dashboard/send-reminder/{report_id}")
async def send_inspection_reminder(
    report_id: int,
    db: Session = Depends(auth.get_db),
    current_user: database.User = Depends(auth.get_current_user)
):
    """Send an inspection reminder email for a specific report."""
    if current_user.role != 'ADMIN':
        raise HTTPException(status_code=403, detail="Csak admin felhasználók érhetik el.")

    report = db.query(database.Report).filter(
        database.Report.id == report_id,
        database.Report.owner_id == current_user.id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Jegyzőkönyv nem található.")

    cd = report.client_data or {}
    customer_name = cd.get('customerName', 'Tisztelt Ügyfelünk')
    site_address = cd.get('siteAddress', '')
    next_date = cd.get('nextInspectionDate', '')
    inspector_name = cd.get('inspectorName', '')

    # Get company settings for branding
    company = db.query(database.CompanySettings).filter(
        database.CompanySettings.owner_id == current_user.id
    ).first()
    company_name = company.company_name if company else 'VBF Készítő'

    # Build email
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not smtp_user or not smtp_pass:
        raise HTTPException(
            status_code=500,
            detail="SMTP nincs konfigurálva. Állítsd be az SMTP_USER és SMTP_PASS környezeti változókat."
        )

    # Try to get the customer's email from the customers table
    customer_email = None
    if cd.get('customerName'):
        cust = db.query(database.Customer).filter(
            database.Customer.name == cd['customerName'],
            database.Customer.owner_id == current_user.id
        ).first()
        # Note: Customer model doesn't have email field yet, 
        # so we'd need the admin to provide it or we use the report owner's email
    
    # For now, send to the logged-in user (admin) as a test
    to_email = current_user.email or smtp_user

    subject = f"⚡ Felülvizsgálat Emlékeztető — {site_address}"
    body = f"""Tisztelt {customer_name}!

Ezúton értesítjük, hogy az alábbi ingatlanra vonatkozó időszakos érintésvédelmi 
felülvizsgálat hamarosan esedékes (vagy már lejárt):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Helyszín: {site_address}
📅 Következő felülvizsgálat: {next_date}
📋 Jegyzőkönyv típusa: {report.report_type.upper()}
👷 Utolsó felülvizsgáló: {inspector_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A 40/2017. (XII. 4.) NGM rendelet és az OTSZ előírásai értelmében az 
időszakos felülvizsgálat elvégzése kötelező. A felülvizsgálat elmulasztása 
esetén az épület biztosítása érvénytelenné válhat.

Kérjük, vegye fel velünk a kapcsolatot az időpont egyeztetése érdekében!

Üdvözlettel,
{company_name}
{smtp_user}

---
Ez az email automatikusan lett generálva a VBF Készítő rendszerből.
"""

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg.set_content(body)

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return {"message": f"Emlékeztető email sikeresen elküldve ide: {to_email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email küldési hiba: {str(e)}")


# ═══════════════════════════════════════════════
# Internal helper functions
# ═══════════════════════════════════════════════

def _analyze_defects(db: Session, owner_id: int) -> dict:
    """Analyze defects across all reports for the given user."""
    reports = db.query(database.Report).filter(
        database.Report.owner_id == owner_id
    ).all()

    category_counts = {'A': 0, 'B': 0, 'C': 0, 'D': 0}
    total_defects: int = 0
    common_defects = {}
    reports_with_defects: int = 0

    for rep in reports:
        defects = rep.defects_data or []
        if isinstance(defects, str):
            try:
                defects = json.loads(defects)
            except (json.JSONDecodeError, TypeError):
                defects = []

        if len(defects) > 0:
            reports_with_defects += 1

        for d in defects:
            total_defects += 1
            desc = (d.get('description') or '').lower()

            # Auto-classify based on keywords (mirroring frontend autoDetectMEE)
            cat = _classify_defect(desc)
            category_counts[cat] += 1

            # Track common defect types by template
            tpl_id = d.get('templateId', 'Egyéb')
            if tpl_id:
                common_defects[tpl_id] = common_defects.get(tpl_id, 0) + 1

    # Top 5 most common defects
    top_defects = sorted(common_defects.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "total_defects": total_defects,
        "reports_with_defects": reports_with_defects,
        "category_breakdown": category_counts,
        "top_defects": [{"template_id": t, "count": c} for t, c in top_defects],
    }


def _classify_defect(desc: str) -> str:
    """Classify defect into A/B/C/D category based on keywords."""
    a_keywords = ['életveszély', 'áramütés', 'tűzveszély', 'szikra', 'füst', 'olvadt']
    b_keywords = ['hiányzó védővezető', 'pe hiány', 'nincs érintésvédelem', 'szakadt', 'tört']
    d_keywords = ['régi szabvány', 'korszerűtlen', 'alumínium', 'elavult']
    c_keywords = ['laza', 'korrózió', 'jelölés', 'fedél', 'takaró']

    if any(kw in desc for kw in a_keywords):
        return 'A'
    if any(kw in desc for kw in b_keywords):
        return 'B'
    if any(kw in desc for kw in d_keywords):
        return 'D'
    if any(kw in desc for kw in c_keywords):
        return 'C'
    return 'C'


def _analyze_results(db: Session, owner_id: int) -> dict:
    """Analyze measurement pass/fail results across all reports."""
    reports = db.query(database.Report).filter(
        database.Report.owner_id == owner_id
    ).all()

    total_measurements = 0
    passed = 0
    failed = 0

    result_types = {
        'MEGFELELŐ': 0,
        'VÁLTOZAT_C': 0,
        'VÁLTOZAT_B': 0,
        'NEM MEGFELELŐ': 0,
    }

    for rep in reports:
        cd = rep.client_data or {}
        result = cd.get('reportResult') or cd.get('meeQualification') or ''
        if result in result_types:
            result_types[result] += 1

        # Count individual measurements
        mdata = rep.measurements_data or []
        if isinstance(mdata, str):
            try:
                mdata = json.loads(mdata)
            except (json.JSONDecodeError, TypeError):
                mdata = []

        for mset in (mdata if isinstance(mdata, list) else [mdata]):
            if not isinstance(mset, dict):
                continue
            for table_key in ['rpe', 'insulation', 'loop', 'rcd', 'tools', 'selv', 'eph_cont']:
                rows = mset.get(table_key, [])
                if isinstance(rows, list):
                    for row in rows:
                        if isinstance(row, dict) and 'pass' in row:
                            total_measurements += 1
                            if row['pass'] == 'Igen':
                                passed += 1
                            elif row['pass'] == 'Nem':
                                failed += 1

    pass_rate: float = 0.0
    if total_measurements > 0:
        pass_rate = float(round((float(passed) / float(total_measurements) * 100.0) * 10) / 10.0)

    return {
        "total_measurements": total_measurements,
        "passed": passed,
        "failed": failed,
        "pass_rate": pass_rate,
        "qualification_breakdown": result_types,
    }
