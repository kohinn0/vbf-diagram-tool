"""
ReportLab-alapú PDF generátor – LibreOffice nélkül, alacsony erőforrás-igény.
A PDF tartalmazza a Digitális Integritás (SHA-256) szekciót. Word export = piszkozat, nincs hash.
"""
import io
import base64
import hashlib
import json
import os
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, Flowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

import database
from database import Report

# Helvetica mindig elérhető; DejaVu támogatja az ékezetes karaktereket (Docker: fonts-dejavu-core)
FONT_NAME = 'Helvetica'
for _path in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf']:
    if os.path.exists(_path):
        try:
            pdfmetrics.registerFont(TTFont('DejaVuSans', _path))
            FONT_NAME = 'DejaVuSans'
        except Exception:
            pass
        break


def _get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='Header',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_RIGHT
    ))
    styles.add(ParagraphStyle(
        name='Title',
        parent=styles['Heading1'],
        fontSize=16,
        spaceBefore=12,
        spaceAfter=8,
        alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        name='Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_CENTER,
        spaceAfter=16
    ))
    styles.add(ParagraphStyle(
        name='H1',
        parent=styles['Heading1'],
        fontSize=13,
        spaceBefore=14,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='H2',
        parent=styles['Heading2'],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        name='Body',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='BodyJustify',
        parent=styles['Body'],
        alignment=TA_JUSTIFY
    ))
    return styles


def _table_from_rows(data, col_widths=None):
    t = Table(data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def _get_settings(report: Report, db) -> Optional[object]:
    if not db or not report.owner_id:
        return None
    owner = db.query(database.User).filter(database.User.id == report.owner_id).first()
    if not owner:
        return None
    if owner.company_id:
        return db.query(database.CompanySettings).filter(
            database.CompanySettings.company_id == owner.company_id
        ).first()
    return db.query(database.CompanySettings).filter(
        database.CompanySettings.owner_id == report.owner_id
    ).first()


def _build_integrity_data(report: Report, c_data: dict, d_data: list, r_val: str, rep_id_str: str) -> dict:
    meas = c_data.get('measurement_count', {}) or {}
    if not meas and report.measurements_data:
        m0 = report.measurements_data[0] if report.measurements_data else {}
        meas = {
            'rpe': len(m0.get('rpe', []) if isinstance(m0, dict) else []),
            'riso': len(m0.get('insulation', []) if isinstance(m0, dict) else []),
            'loop': len(m0.get('loop', []) if isinstance(m0, dict) else []),
            'rcd': len(m0.get('rcd', []) if isinstance(m0, dict) else []),
        }
    return {
        'report_id': rep_id_str,
        'client': c_data.get('customerName', c_data.get('clientName', '')),
        'address': c_data.get('siteAddress', ''),
        'inspector': c_data.get('inspectorName', ''),
        'instrument': c_data.get('instrumentType', ''),
        'calibration': c_data.get('instrumentCal', ''),
        'result': r_val,
        'issued': datetime.now().isoformat(),
        'measurement_count': meas,
        'defect_count': len(d_data),
    }


def generate_pdf_reportlab_stream(
    report: Report,
    db=None,
    share_url: Optional[str] = None,
) -> io.BytesIO:
    """ReportLab-bal közvetlenül PDF generálása – nincs LibreOffice. SHA-256 integrálva."""
    buffer = io.BytesIO()
    settings = _get_settings(report, db)
    styles = _get_styles()

    rep_type = (report.report_type or "VBF").upper()
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    rep_id_str = f"{short_rep_type}-{report.created_at.year}-{report.id:03d}" if report.id and report.created_at else f"{short_rep_type}-TERVEZET"

    c_data = report.client_data or {}
    d_data = report.defects_data or []
    meas_data = report.measurements_data[0] if report.measurements_data else {}
    if not isinstance(meas_data, dict):
        meas_data = {}

    company_name = getattr(settings, 'company_name', None) or "VBF Program"

    def header_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(FONT_NAME, 9)
        canvas.setFillColor(colors.HexColor('#6b7280'))
        canvas.drawRightString(A4[0] - 1.5 * cm, A4[1] - 1 * cm, f"{company_name} | Azonosító: {rep_id_str}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=1.8 * cm, rightMargin=1.8 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm
    )
    story = []

    # Logo
    if settings and getattr(settings, 'logo_path', None) and os.path.exists(settings.logo_path):
        try:
            from PIL import Image as PilImage
            img = PilImage.open(settings.logo_path)
            img_buf = io.BytesIO()
            img.save(img_buf, format='PNG')
            img_buf.seek(0)
            story.append(Image(img_buf, width=4 * cm, height=2 * cm))
            story.append(Spacer(1, 0.5 * cm))
        except Exception:
            pass

    # Cím
    title_map = {
        "VBF_IDOSZAKOS": "Időszakos Villamos Biztonsági Felülvizsgálati (VBF) Jegyzőkönyv",
        "VBF_ELSO": "Első Villamos Biztonsági Felülvizsgálati (VBF) Jegyzőkönyv",
        "VBF_BERBEADAS": "Bérbeadás Előtti Villamos Biztonsági Felülvizsgálati (VBF) Jegyzőkönyv",
        "VBF_ELADAS": "Tulajdonosváltás / Eladás Előtti Villamos Biztonsági Felülvizsgálati (VBF) Jegyzőkönyv",
        "EPH": "EPH Kialakítás és Bekötés Felülvizsgálati Jegyzőkönyv",
    }
    title_text = title_map.get(rep_type, "Villamos Biztonsági Felülvizsgálati Jegyzőkönyv")
    story.append(Paragraph(title_text, styles['Title']))
    story.append(Paragraph("Hivatalos Minősítő Irat", styles['Subtitle']))

    # Share QR
    if share_url:
        try:
            import qrcode
            qr = qrcode.QRCode(version=1, box_size=5, border=2)
            qr.add_data(share_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_buf = io.BytesIO()
            qr_img.save(qr_buf, format='PNG')
            qr_buf.seek(0)
            story.append(Image(qr_buf, width=3 * cm, height=3 * cm))
            story.append(Paragraph("Megosztás / Letöltés", styles['Subtitle']))
        except Exception:
            pass

    # Összefoglaló kártya
    r_val = c_data.get('reportResult', c_data.get('autoQualification', 'N/A'))
    critical_kw = ['életveszély', 'érintésvéd', 'pe vezető hiány', 'áramütés', 'tűzveszély']
    serious_kw = ['szigetelés', 'rcd nem', 'ávk nem', 'fi-relé nem', 'hurokellenállás']
    def _is_crit(d):
        return any(k in (d.get('description') or '').lower() for k in critical_kw)
    def _is_ser(d):
        return any(k in (d.get('description') or '').lower() for k in serious_kw)
    cnt_a = sum(1 for d in d_data if _is_crit(d))
    cnt_b = sum(1 for d in d_data if _is_ser(d) and not _is_crit(d))

    card_data = [
        ['Ügyfél / Megrendelő', c_data.get('customerName', 'N/A')],
        ['Vizsgálat helyszíne', c_data.get('siteAddress', 'N/A')],
        ['Vizsgálat dátuma', c_data.get('inspectionDate', report.created_at.strftime('%Y-%m-%d') if report.created_at else 'N/A')],
        ['Következő vizsgálat', c_data.get('nextInspectionDate', 'N/A')],
        ['Eredmény', r_val],
        ['Kritikus (A) / Súlyos (B) hibák', f'{cnt_a} / {cnt_b} db'],
    ]
    story.append(Paragraph("ÖSSZEFOGLALÓ KÁRTYA", styles['H2']))
    story.append(_table_from_rows([['Mező', 'Érték']] + card_data))
    story.append(Spacer(1, 0.5 * cm))

    # 1. Cél és jogszabályok
    story.append(Paragraph("1. Cél és Vonatkozó Jogszabályok", styles['H1']))
    preamble = (
        "Jelen jegyzőkönyv a vizsgált villamos berendezés, villamos hálózat, illetve berendezések "
        "áramütés elleni védelmének, szabványos állapotának, valamint tűzvédelmi megfelelőségének "
        "minősítése céljából készült a Megrendelő megbízásából. A dokumentum az érvényben lévő nemzeti, "
        "illetve harmonizált európai szabványok szigorú betartása mellett lett összeállítva."
    )
    story.append(Paragraph(preamble, styles['BodyJustify']))
    story.append(Spacer(1, 0.3 * cm))

    # 2. Alapadatok
    story.append(Paragraph("2. Alapadatok és Helyszín", styles['H1']))
    story.append(Paragraph(
        f"<b>Megrendelő / Üzemeltető:</b> {c_data.get('customerName', 'N/A')}<br/>"
        f"<b>Vizsgálat helyszíne:</b> {c_data.get('siteAddress', 'N/A')}<br/>"
        f"<b>Helyrajzi Szám (HRSZ):</b> {c_data.get('siteHrsz', 'N/A')}<br/>"
        f"<b>Épület rendeltetése:</b> {c_data.get('buildingPurpose', 'N/A')}"
    , styles['Body']))
    story.append(Spacer(1, 0.3 * cm))

    # 3. Felülvizsgáló
    story.append(Paragraph("3. Felülvizsgáló és Műszerek", styles['H1']))
    story.append(Paragraph(
        f"<b>Felülvizsgáló neve/cége:</b> {c_data.get('inspectorName', 'N/A')}<br/>"
        f"<b>Vizsgabizonyítvány száma:</b> {c_data.get('inspectorLicense', 'N/A')}<br/>"
        f"<b>Alkalmazott Mérőműszer:</b> {c_data.get('instrumentType', 'N/A')}<br/>"
        f"<b>Kalibrálás érvényessége:</b> {c_data.get('instrumentCal', 'N/A')}"
    , styles['Body']))
    story.append(Spacer(1, 0.3 * cm))

    # Diagram
    diagram_b64 = getattr(report, 'diagram_image', None)
    if diagram_b64 and ',' in str(diagram_b64):
        try:
            story.append(PageBreak())
            story.append(Paragraph("4. Egyvonalas Rajz (Áramkör Áttekintés)", styles['H1']))
            b64_str = diagram_b64.split(',')[1]
            img_bytes = io.BytesIO(base64.b64decode(b64_str))
            story.append(Image(img_bytes, width=14 * cm, height=10 * cm))
        except Exception:
            pass

    # Mérések
    section_num = 5
    if meas_data:
        story.append(PageBreak())
        story.append(Paragraph(f"{section_num}. Mérési Eredmények", styles['H1']))
        sub = 1

        if rep_type.startswith("VBF") or rep_type == "VVF":
            for key, headers, row_keys in [
                ('rpe', ['Pont', 'Mérés Helye', 'Rpe [Ω]', 'Megfelel'], ['point', 'loc', 'val', 'pass']),
                ('insulation', ['Áramkör', 'Riso L-N [MΩ]', 'Riso L-PE [MΩ]', 'Riso N-PE [MΩ]', 'Megfelel'], ['circuit', 'ln', 'lpe', 'npe', 'pass']),
                ('loop', ['Áramkör / Pont', 'Kikapcsoló szerv', 'Hely', 'Zs [Ω]', 'Megfelel'], ['circuit', 'device', 'loc', 'zs', 'pass']),
                ('rcd', ['Áramkör', 'Típus', 'IΔn [mA]', '1xIΔn [ms]', 'Megfelel'], ['circ', 'type', 'idn', 't1', 'pass']),
            ]:
                lst = meas_data.get(key, [])
                if lst:
                    story.append(Paragraph(f"{section_num}.{sub} {headers[0]} tábla", styles['H2']))
                    rows = [headers]
                    for r in lst:
                        rows.append([str(r.get(k, '')) for k in row_keys[:len(headers)]])
                    story.append(_table_from_rows(rows))
                    sub += 1
        elif rep_type == "EPH":
            eph_list = meas_data.get('eph_cont', [])
            if eph_list:
                h = ['Sorszám', 'Bekötött Elem', 'Hely', 'Vezető', 'Kötés', 'Folytonosság [Ω]', 'Megfelel']
                rows = [h]
                for r in eph_list:
                    rows.append([str(r.get(k, '')) for k in ['idx', 'elem', 'loc', 'mat', 'conn', 'val', 'pass']])
                story.append(_table_from_rows(rows))
        section_num += 1

    # Hibák
    story.append(PageBreak())
    story.append(Paragraph(f"{section_num}. Feltárt Hibák és Hiányosságok", styles['H1']))
    if not d_data:
        story.append(Paragraph("A vizsgálat során nem tártunk fel hibát vagy hiányosságot.", styles['Body']))
    else:
        for idx, defect in enumerate(d_data, 1):
            story.append(Paragraph(f"Hiba #{idx}: {defect.get('description', 'N/A')}", styles['H2']))
            story.append(Paragraph(
                f"<b>Helyszín:</b> {defect.get('location', 'N/A')}<br/>"
                f"<b>Javítási határidő:</b> {defect.get('deadline', 'N/A')}"
            , styles['Body']))
    section_num += 1

    # Minősítés
    story.append(Paragraph(f"{section_num}. Összefoglaló Minősítés", styles['H1']))
    story.append(Paragraph(r_val, styles['Body']))
    disclaimer = (
        "Az ellenőrzés csak a szemrevételezéssel és jelentős bontás nélkül megközelíthető részekre, "
        "valamint a vonatkozó szabványban (MSZ HD 60364-6) rögzített tesztpontokon végzett műszeres mérésekre terjedt ki. "
        "A minősítés és a feltárt hibák dokumentálása a felülvizsgálat időpontjában érvényes jogszabályok alapján történt."
    )
    story.append(Paragraph(disclaimer, styles['BodyJustify']))

    # Digitális Integritás – csak PDF-ben, SHA-256
    section_num += 1
    story.append(PageBreak())
    story.append(Paragraph(f"{section_num}. Digitális Integritás és Nyomonkövethetőség", styles['H1']))

    m0 = report.measurements_data[0] if report.measurements_data else {}
    meas_counts = {
        'rpe': len(m0.get('rpe', [])) if isinstance(m0, dict) else 0,
        'riso': len(m0.get('insulation', [])) if isinstance(m0, dict) else 0,
        'loop': len(m0.get('loop', [])) if isinstance(m0, dict) else 0,
        'rcd': len(m0.get('rcd', [])) if isinstance(m0, dict) else 0,
    }
    integrity_data = _build_integrity_data(report, c_data, d_data, r_val, rep_id_str)
    integrity_data['measurement_count'] = meas_counts
    payload_json = json.dumps(integrity_data, ensure_ascii=False, sort_keys=True)
    content_hash = hashlib.sha256(payload_json.encode('utf-8')).hexdigest()

    # QR kód
    qr_payload = json.dumps({
        'id': rep_id_str,
        'hash': content_hash[:16],
        'date': datetime.now().strftime('%Y-%m-%d'),
        'result': r_val,
    }, ensure_ascii=False)
    try:
        import qrcode
        qr = qrcode.QRCode(version=1, box_size=6, border=2)
        qr.add_data(qr_payload)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_buf = io.BytesIO()
        qr_img.save(qr_buf, format='PNG')
        qr_buf.seek(0)
        story.append(Image(qr_buf, width=4 * cm, height=4 * cm))
    except Exception:
        pass

    story.append(Paragraph(f"<b>Azonosító:</b> {rep_id_str}", styles['Body']))
    story.append(Paragraph(f"<b>Generálás dátuma:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Body']))
    story.append(Paragraph(f"<b>SHA-256 Hash:</b> {content_hash}", styles['Body']))
    story.append(Paragraph(
        "A fenti SHA-256 hash a dokumentum minden lényeges adatából számított egyedi lenyomat. "
        "Bármilyen módosítás esetén a hash megváltozik, ezáltal a manipuláció kimutatható.",
        styles['BodyJustify']
    ))

    # Aláírás kép
    if settings and getattr(settings, 'signature_path', None) and os.path.exists(settings.signature_path):
        try:
            from PIL import Image as PilImage
            sig_img = PilImage.open(settings.signature_path)
            sig_buf = io.BytesIO()
            sig_img.save(sig_buf, format='PNG')
            sig_buf.seek(0)
            story.append(Spacer(1, 1 * cm))
            story.append(Image(sig_buf, width=4.5 * cm, height=2 * cm))
        except Exception:
            pass
    story.append(Paragraph("Aláírás és Bélyegző", styles['Body']))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    buffer.seek(0)
    return buffer
