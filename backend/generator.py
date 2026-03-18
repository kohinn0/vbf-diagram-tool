import io
import base64
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logger = logging.getLogger("vbf")

try:
    from PIL import Image as PilImage
except ImportError:
    PilImage = None

import database
from database import Report
import hashlib
import json
import qrcode
from datetime import datetime
from typing import Optional


def _resize_image_bytes(raw_bytes: bytes, max_width_px: int = 1280) -> io.BytesIO:
    """
    Képeket méretezzük át egy ésszerű szélességre (pl. 1280px),
    hogy a DOCX/PDF mérete és memóriaigénye ne szálljon el nagy felbontású fotóknál.
    """
    buf = io.BytesIO(raw_bytes)
    if not PilImage:
        buf.seek(0)
        return buf
    try:
        img = PilImage.open(buf)
        w, h = img.size
        if w > max_width_px:
            new_h = int(h * max_width_px / w)
            img = img.resize((max_width_px, new_h))
        out = io.BytesIO()
        img.save(out, format="PNG")
        out.seek(0)
        return out
    except Exception as e:
        logger.warning(f"Kép átméretezése sikertelen, eredeti méretet használjuk: {e}")
        buf.seek(0)
        return buf


def _hex_to_rgb(hex_str: Optional[str]):
    """Hex szín (pl. #1e3a5f vagy 1e3a5f) -> (r, g, b) vagy None."""
    if not hex_str or not isinstance(hex_str, str):
        return None
    s = hex_str.strip().lstrip("#")
    if len(s) != 6:
        return None
    try:
        return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))
    except ValueError:
        return None


# ─── Premium dokumentum stílusok ───
def _apply_premium_styles(doc, section, header_para, primary_rgb=None, footer_text=None):
    """Margók, alap betűtípus, címsorok, fejléc és opcionális egyéni lábléc megjelenése."""
    # Margók: széles, professzionális
    section.left_margin = Cm(1.8)
    section.right_margin = Cm(1.8)
    section.top_margin = Cm(1.5)
    section.bottom_margin = Cm(1.5)
    # Normal: Calibri 11pt, térköz után
    try:
        normal = doc.styles['Normal']
        normal.font.name = 'Calibri'
        normal.font.size = Pt(11)
        normal.paragraph_format.space_after = Pt(6)
        normal.paragraph_format.line_spacing = 1.15
    except Exception as e:
        logger.warning(f"Word 'Normal' stílus beállítása sikertelen: {e}")
    _rgb = primary_rgb or (31, 41, 55)
    # Heading 1: szakaszcímek
    try:
        h1 = doc.styles['Heading 1']
        h1.font.name = 'Calibri'
        h1.font.size = Pt(14)
        h1.font.bold = True
        h1.font.color.rgb = RGBColor(*_rgb)
        h1.paragraph_format.space_before = Pt(16)
        h1.paragraph_format.space_after = Pt(8)
    except Exception as e:
        logger.warning(f"Word 'Heading 1' stílus beállítása sikertelen: {e}")
    # Heading 2: alszakaszok (kicsit világosabb árnyalat)
    _rgb2 = (min(55, _rgb[0] + 24), min(65, _rgb[1] + 24), min(81, _rgb[2] + 26)) if primary_rgb else (55, 65, 81)
    try:
        h2 = doc.styles['Heading 2']
        h2.font.name = 'Calibri'
        h2.font.size = Pt(12)
        h2.font.bold = True
        h2.font.color.rgb = RGBColor(*_rgb2)
        h2.paragraph_format.space_before = Pt(10)
        h2.paragraph_format.space_after = Pt(4)
    except Exception as e:
        logger.warning(f"Word 'Heading 2' stílus beállítása sikertelen: {e}")
    # Fejléc: kisebb, szürke
    for run in header_para.runs:
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(107, 114, 128)
        run.font.name = 'Calibri'

    # Lábléc: opcionális egyéni szöveg (balra), majd oldalszám (középen)
    try:
        footer = section.footer
        if (footer_text or "").strip():
            p_left = footer.add_paragraph((footer_text or "").strip())
            p_left.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p_left.runs:
                r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(107, 114, 128)
                r.font.name = 'Calibri'
        if (footer_text or "").strip():
            footer_para = footer.add_paragraph()
        else:
            footer_para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        footer_para.add_run("Oldal ")
        page_run = footer_para.add_run("1")
        fld_begin = OxmlElement('w:fldChar')
        fld_begin.set(qn('w:fldCharType'), 'begin')
        page_run._r.append(fld_begin)
        instr = OxmlElement('w:instrText')
        instr.set(qn('xml:space'), 'preserve')
        instr.text = 'PAGE'
        page_run._r.append(instr)
        fld_sep = OxmlElement('w:fldChar')
        fld_sep.set(qn('w:fldCharType'), 'separate')
        page_run._r.append(fld_sep)
        fld_end = OxmlElement('w:fldChar')
        fld_end.set(qn('w:fldCharType'), 'end')
        page_run._r.append(fld_end)
        for r in footer_para.runs:
            r.font.size = Pt(9)
            r.font.color.rgb = RGBColor(107, 114, 128)
            r.font.name = 'Calibri'
    except Exception as e:
        logger.warning(f"Lábléc (oldalszám) beállítása sikertelen: {e}")


def _visual_label(val):
    """Szemrevételezés / ellenőrzés érték → Megfelelő / Nem felel meg / Nem alkalmazható."""
    if val in (True, 'ok', 'true'):
        return "Megfelelő"
    if val == 'na':
        return "Nem alkalmazható"
    return "Nem felel meg"


def _voltage_drop_label(val):
    """Feszültségesés 6.4.3.11: ok/fail/na/attachment."""
    if val == 'attachment':
        return "Mellékletben"
    return _visual_label(val)


def _add_std_ref(doc, text: str):
    """Szabványhivatkozás beillesztése kis, szürke, dőlt betűvel."""
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(107, 114, 128)
    run.font.italic = True
    run.font.name = 'Calibri'
    p.paragraph_format.space_after = Pt(4)


def _style_table_header(table):
    """Tábla fejlécsora: szürke háttér, félkövér szöveg."""
    try:
        row0 = table.rows[0]
        for cell in row0.cells:
            tc = cell._tc
            tcPr = tc.get_or_add_tcPr()
            shd = OxmlElement('w:shd')
            shd.set(qn('w:fill'), 'E2E8F0')
            shd.set(qn('w:val'), 'clear')
            tcPr.append(shd)
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.bold = True
                    run.font.size = Pt(10)
                    run.font.name = 'Calibri'
    except Exception as e:
        logger.warning(f"Tábla fejléc stílus beállítása sikertelen: {e}")


def generate_docx_stream(report: Report, db=None, share_url: Optional[str] = None) -> io.BytesIO:
    doc = Document()
    
    settings = None
    if db and report.owner_id:
        owner = db.query(database.User).filter(database.User.id == report.owner_id).first()
        if owner and owner.company_id:
            settings = db.query(database.CompanySettings).filter(database.CompanySettings.company_id == owner.company_id).first()
        if not settings:
            settings = db.query(database.CompanySettings).filter(database.CompanySettings.owner_id == report.owner_id).first()
    
    # Header
    rep_type = report.report_type.upper() if report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    
    if report.id and report.created_at:
        rep_id_str = f"{short_rep_type}-{report.created_at.year}-{report.id:03d}"
    else:
        rep_id_str = f"{short_rep_type}-TERVEZET"

    primary_rgb = _hex_to_rgb(settings.docx_primary_color) if settings and getattr(settings, "docx_primary_color", None) else None

    section = doc.sections[0]
    header = section.header
    if not header.paragraphs:
        header_para = header.add_paragraph()
    else:
        header_para = header.paragraphs[0]
    company_name = settings.company_name if settings and settings.company_name else "VBF Program"
    if settings and getattr(settings, "docx_header_text", None) and (settings.docx_header_text or "").strip():
        header_text = (settings.docx_header_text or "").strip().replace("{rep_id}", rep_id_str).replace("{azonosito}", rep_id_str)
        header_para.text = header_text
    else:
        header_para.text = f"{company_name} | Azonosító: {rep_id_str}"
    header_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    footer_text = (settings.docx_footer_text or "").strip() if settings and getattr(settings, "docx_footer_text", None) else None
    _apply_premium_styles(doc, section, header_para, primary_rgb, footer_text=footer_text)

    # Insert Logo at the top if exists
    if settings and settings.logo_path and os.path.exists(settings.logo_path):
        import io as custom_io
        from PIL import Image
        try:
            # We add it to the first paragraph of the body
            logo_p = doc.add_paragraph()
            logo_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            logo_img = Image.open(settings.logo_path)
            
            # Since WebP might have issues directly in Word via docx in some versions, convert temporarily to PNG in memory
            img_byte_arr = custom_io.BytesIO()
            logo_img.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            logo_p.add_run().add_picture(img_byte_arr, width=Cm(5))
        except Exception as e:
            print(f"Hiba a logó beillesztésekor: {e}")
    
    # Title
    if rep_type == "VBF_IDOSZAKOS":
        title_text = "Időszakos Villamos Biztonsági Felülvizsgálati (VBF) Jegyzőkönyv"
    elif rep_type == "VBF_ELSO":
        title_text = "Első Villamos Biztonsági Felülvizsgálati (VBF) Jegyzőkönyv"
    elif rep_type == "VBF_BERBEADAS":
        title_text = "Bérbeadás Előtti Villamos Biztonsági Felülvizsgálati (VBF) Jegyzőkönyv"
    elif rep_type == "VBF_ELADAS":
        title_text = "Tulajdonosváltás / Eladás Előtti Villamos Biztonsági Felülvizsgálati (VBF) Jegyzőkönyv"
    elif rep_type == "EPH":
        title_text = "EPH Kialakítás és Bekötés Felülvizsgálati Jegyzőkönyv"
    else:
        title_text = f"Villamos Biztonsági Felülvizsgálati Jegyzőkönyv"

    # Címblokk – premium megjelenés
    title_para = doc.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_para.add_run(title_text)
    title_run.bold = True
    title_run.font.size = Pt(18)
    title_run.font.name = 'Calibri'
    title_run.font.color.rgb = RGBColor(15, 23, 42)
    title_para.paragraph_format.space_before = Pt(6)
    title_para.paragraph_format.space_after = Pt(4)

    subtitle_para = doc.add_paragraph()
    subtitle_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = subtitle_para.add_run("Hivatalos Minősítő Irat")
    sub_run.font.size = Pt(11)
    sub_run.font.name = 'Calibri'
    sub_run.font.color.rgb = RGBColor(100, 116, 139)
    sub_run.italic = True
    subtitle_para.paragraph_format.space_after = Pt(6)
    legend_para = doc.add_paragraph()
    legend_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    legend_run = legend_para.add_run("Jelmagyarázat: MF = Megfelelő, NEM = Nem felel meg, NA = Nem alkalmazható")
    legend_run.font.size = Pt(9)
    legend_run.font.color.rgb = RGBColor(107, 114, 128)
    legend_run.font.name = 'Calibri'
    legend_para.paragraph_format.space_after = Pt(12)

    # ── Összefoglaló kártya (1 oldal) ──
    c_data = report.client_data or {}
    d_data = report.defects_data or []
    critical_kw = ['életveszély', 'érintésvéd', 'pe vezető hiány', 'áramütés', 'tűzveszély', 'védővezető hiány', 'beégett', 'érinthető feszültség']
    serious_kw = ['szigetelés', 'rcd nem', 'ávk nem', 'fi-relé nem', 'hurokellenállás', 'túlterhelés', 'zárlat', 'hurokimpedancia', 'nem old ki']
    def _is_critical(desc):
        return any(kw in desc for kw in critical_kw)
    def _is_serious(desc):
        return any(kw in desc for kw in serious_kw)
    cnt_a = sum(1 for d in d_data if _is_critical((d.get('description') or '').lower()))
    cnt_b = sum(1 for d in d_data if _is_serious((d.get('description') or '').lower()) and not _is_critical((d.get('description') or '').lower()))
    r_val = c_data.get('reportResult', c_data.get('meeQualification', 'N/A'))
    
    card_p = doc.add_paragraph()
    card_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    card_run = card_p.add_run("ÖSSZEFOGLALÓ KÁRTYA")
    card_run.bold = True
    card_run.font.size = Pt(12)
    card_run.font.color.rgb = RGBColor(55, 65, 81)
    card_p.paragraph_format.space_after = Pt(8)
    
    card_rows = [
        ('Ügyfél / Megrendelő', c_data.get('customerName', 'N/A')),
        ('Vizsgálat helyszíne', c_data.get('siteAddress', 'N/A')),
        ('Vizsgálat dátuma', c_data.get('inspectionDate', report.created_at.strftime('%Y-%m-%d') if report.created_at else 'N/A')),
        ('Következő vizsgálat', c_data.get('nextInspectionDate', 'N/A')),
        ('Eredmény', r_val),
        ('Kritikus (A) / Súlyos (B) hibák', f'{cnt_a} / {cnt_b} db'),
    ]
    if (report.title or '').strip():
        card_rows.insert(2, ('Dokumentum címe', (report.title or '').strip()))
    sp = c_data.get('supplyPhases', '')
    if sp:
        card_rows.insert(4, ('Bejövő fázisok', '1 fázis (1×230 V)' if sp == '1' else '3 fázis (3×230/400 V)'))
    ss = (c_data.get('supplySystem') or '').strip()
    if ss:
        card_rows.insert(5 if sp else 4, ('Villamos rendszer', ss))
    card_table = doc.add_table(rows=len(card_rows), cols=2)
    card_table.style = 'Table Grid'
    _style_table_header(card_table)
    for i, (label, val) in enumerate(card_rows):
        card_table.rows[i].cells[0].text = label
        card_table.rows[i].cells[1].text = str(val)
    doc.add_paragraph()
    
    # ── QR-kód a borítólapra (megosztási / PDF link) ──
    if share_url:
        try:
            qr_cover = qrcode.QRCode(version=1, box_size=5, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
            qr_cover.add_data(share_url)
            qr_cover.make(fit=True)
            qr_cover_img = qr_cover.make_image(fill_color="black", back_color="white")
            qr_cover_buf = io.BytesIO()
            qr_cover_img.save(qr_cover_buf, format='PNG')
            qr_cover_buf.seek(0)
            qr_cover_para = doc.add_paragraph()
            qr_cover_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            qr_cover_para.add_run().add_picture(qr_cover_buf, width=Cm(3.5))
            qr_label_para = doc.add_paragraph("Megosztás / Letöltés")
            qr_label_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in qr_label_para.runs:
                r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(107, 114, 128)
        except Exception as e:
            doc.add_paragraph(f"[QR kód: {str(e)}]")
    
    doc.add_paragraph()
    subtitle_para.paragraph_format.space_after = Pt(6)
    
    # ── Tartalomjegyzék (TOC) ──
    doc.add_heading('Tartalomjegyzék', level=1)
    toc_para = doc.add_paragraph()
    toc_run = toc_para.add_run()
    
    # XML instruction for Word to insert TOC field
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    toc_run._r.append(fldChar1)
    
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'TOC \\o "1-2" \\h \\z \\u'
    toc_run._r.append(instrText)
    
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    toc_run._r.append(fldChar2)
    
    # Placeholder text (Word updates this on first open if doc.settings allows)
    toc_run2 = toc_para.add_run('(A tartalomjegyzék frissítéséhez nyomjon Ctrl+A majd F9-et, vagy fogadja el a frissítést megnyitáskor)')
    toc_run2.font.color.rgb = RGBColor(128, 128, 128)
    toc_run2.font.italic = True
    
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    toc_run2._r.append(fldChar3)
    
    # Set Word to update fields on open
    doc.settings.element.append(OxmlElement('w:updateFields', {qn('w:val'): 'true'}))
    
    doc.add_page_break()
    
    # Preamble / Bevezető
    doc.add_heading('1. Cél és Vonatkozó Jogszabályok', level=1)
    if rep_type == "VBF_IDOSZAKOS":
        szabvany_ref = "• MSZ 10900 és MSZ HD 60364-6:2017 – Kisfeszültségű villamos berendezések időszakos ellenőrzése\n"
    elif rep_type == "VBF_ELSO":
        szabvany_ref = "• MSZ HD 60364-6:2017 – Kisfeszültségű villamos berendezések első ellenőrzése\n"
    else:
        szabvany_ref = "• MSZ HD 60364-6:2017 / MSZ 10900 – Érintésvédelmi felülvizsgálatok\n"
    
    # TvMI 7.7:2026.02.01 irányelv hivatkozás (hatályos 2026.02.01-től)
    tvmi_ref = "• TvMI 7.7:2026.02.01 – Villamos berendezések és villámvédelem tűzvédelmi felülvizsgálata (hatályos irányelv)\n"

    preamble_text = (
        "Jelen jegyzőkönyv a vizsgált villamos berendezés, villamos hálózat, illetve berendezések "
        "áramütés elleni védelmének, szabványos állapotának, valamint tűzvédelmi megfelelőségének "
        "minősítése céljából készült a Megrendelő megbízásából.\n\n"
        "A dokumentum az érvényben lévő nemzeti, illetve harmonizált európai szabványok szigorú betartása "
        "mellett lett összeállítva. A rögzített eredmények bírósági, hatósági, illetve biztosítói eljárások során "
        "hivatalos szakvéleményként / bizonyító erejű okiratként használhatók fel.\n\n"
        "1.1. A vizsgálat során alkalmazott főbb jogszabályok és rendeletek:\n"
        "• 40/2017. (XII. 4.) NGM rendelet – Az összekötő és felhasználói berendezésekről, valamint a Villamos Műszaki Biztonsági Szabályzatról (VMBSZ)\n"
        "• 54/2014. (XII. 5.) BM rendelet – Országos Tűzvédelmi Szabályzat (OTSZ)\n"
        f"{szabvany_ref}"
        f"{tvmi_ref}"
        "• MSZ EN 61140:2016 – Áramütés elleni védelem. A villamos berendezésekre és a villamos szerkezetekre vonatkozó közös szempontok\n"
        "• MSZ HD 60364-4-41:2018 – Biztonság. Áramütés elleni védelem\n\n"
        "1.2. A vizsgálat terjedelme, korlátai és a megrendelő felelőssége:\n"
        "A vizsgálat a helyszínen, a megrendelő által biztosított és bemutatott feltételek mellett történt. "
        "A vizsgálati eredmények és a kiadott minősítés kizárólag a vizsgált berendezésre, hozzáférhető hálózati pontokra "
        "és a vizsgálat időpontjában (a helyszíni eljárás napján) fennálló fizikai és méréstechnikai állapotra vonatkoznak. "
        "A felülvizsgáló nem vállal felelősséget a vizsgálat lezárását követően a hálózaton végrehajtott engedély nélküli "
        "beavatkozásokért, átalakításokért, bontásokért vagy a nem rendeltetésszerű használatból eredő meghibásodásokért, balesetekért."
    )
    p_intro = doc.add_paragraph(preamble_text)
    p_intro.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    c_data = report.client_data or {}
    scope_text = (c_data.get('inspectionScope') or '').strip() if isinstance(c_data.get('inspectionScope'), str) else ''
    if scope_text:
        doc.add_paragraph('1.3. Vizsgálat kiterjedése, kivételek:').bold = True
        doc.add_paragraph(scope_text)
        doc.add_paragraph()

    # Client Data – Multi-vizsgálat: több helyszín egy jegyzőkönyvben
    doc.add_heading('2. Alapadatok és Helyszín', level=1)
    sites = c_data.get('sites') or []
    if isinstance(sites, list) and len(sites) > 1:
        for i, site in enumerate(sites, 1):
            if not isinstance(site, dict):
                continue
            doc.add_heading(f'2.{i} Helyszín: {site.get("name", site.get("siteName", f"Helyszín {i}"))}', level=2)
            p = doc.add_paragraph()
            p.add_run('Megrendelő / Üzemeltető: ').bold = True
            p.add_run(site.get('customerName', site.get('customer', c_data.get('customerName', 'N/A'))) + '\n')
            p.add_run('Vizsgálat helyszíne: ').bold = True
            p.add_run(site.get('siteAddress', site.get('address', 'N/A')) + '\n')
            p.add_run('Helyrajzi Szám (HRSZ): ').bold = True
            p.add_run(site.get('siteHrsz', site.get('hrsz', 'N/A')) + '\n')
            b_purpose = site.get('buildingPurpose', site.get('purpose', 'N/A'))
            b_otsz = site.get('buildingOtsz', site.get('otsz', ''))
            otsz_names = {'AK': 'Alacsony Kockázat', 'KK': 'Közepes Kockázat', 'MK': 'Magas Kockázat'}
            otsz_disp = f" [{otsz_names.get(b_otsz, b_otsz)}]" if b_otsz else ''
            p.add_run(f'Épület rendeltetése (OTSZ): {b_purpose}{otsz_disp}\n')
            sp = c_data.get('supplyPhases', '')
            if sp:
                p.add_run('Bejövő fázisok: ').bold = True
                p.add_run('1 fázis (1×230 V)' if sp == '1' else '3 fázis (3×230/400 V)' + '\n')
            ss = (c_data.get('supplySystem') or '').strip()
            if ss:
                p.add_run('Villamos rendszer: ').bold = True
                p.add_run(ss + '\n')
            if site.get('nextInspectionDate'):
                p.add_run('Következő vizsgálat: ').bold = True
                p.add_run(site.get('nextInspectionDate') + '\n')
    else:
        # Egyetlen helyszín (visszafelé kompatibilis)
        p = doc.add_paragraph()
        p.add_run('Megrendelő / Üzemeltető: ').bold = True
        p.add_run(c_data.get('customerName', 'N/A') + '\n')
        p.add_run('Vizsgálat helyszíne: ').bold = True
        p.add_run(c_data.get('siteAddress', 'N/A') + '\n')
        p.add_run('Helyrajzi Szám (HRSZ) / Azonosító: ').bold = True
        p.add_run(c_data.get('siteHrsz', 'N/A') + '\n')
        p.add_run('Épület rendeltetése (OTSZ): ').bold = True
        building_purpose = c_data.get('buildingPurpose', 'N/A')
        building_otsz = c_data.get('buildingOtsz', '')
        otsz_names = {'AK': 'Alacsony Kockázat', 'KK': 'Közepes Kockázat', 'MK': 'Magas Kockázat'}
        otsz_display = f" [{otsz_names.get(building_otsz, building_otsz)}]" if building_otsz else ''
        p.add_run(f"{building_purpose}{otsz_display}" + '\n')
        supply_phases = c_data.get('supplyPhases', '')
        if supply_phases:
            p.add_run('Bejövő fázisok: ').bold = True
            p.add_run(('1 fázis (1×230 V)' if supply_phases == '1' else '3 fázis (3×230/400 V)') + '\n')
        supply_sys = (c_data.get('supplySystem') or '').strip()
        if supply_sys:
            p.add_run('Villamos rendszer (MSZ HD 60364): ').bold = True
            p.add_run(supply_sys + '\n')
        next_insp = c_data.get('nextInspectionDate', '')
        if next_insp:
            p.add_run('Következő kötelező felülvizsgálat (OTSZ): ').bold = True
            p.add_run(next_insp + '\n')
    
    # Inspector Data
    doc.add_heading('3. Felülvizsgáló és Műszerek', level=1)
    p2 = doc.add_paragraph("A vizsgálatot a vonatkozó jogszabályokban előírt szakmai végzettséggel és érvényes vizsgabizonyítvánnyal rendelkező személy végezte.\n")
    p2.add_run('Felülvizsgáló neve/cége: ').bold = True
    p2.add_run(c_data.get('inspectorName', 'N/A') + '\n')
    
    p2.add_run('Vizsgabizonyítvány száma: ').bold = True
    p2.add_run(c_data.get('inspectorLicense', 'N/A') + '\n')
    
    p2.add_run('Alkalmazott Mérőműszer: ').bold = True
    p2.add_run(c_data.get('instrumentType', 'N/A') + '\n')
    
    p2.add_run('Kalibrálás érvényessége: ').bold = True
    p2.add_run(c_data.get('instrumentCal', 'N/A') + '\n')

    # OTSZ előírások ellenőrzése (opcionális, 54/2014. BM)
    otsz_checks = c_data.get('otszChecks') or {}
    otsz_risk = otsz_checks.get('riskClass') or ''
    otsz_seal = otsz_checks.get('sealing') or ''
    otsz_light = otsz_checks.get('safetyLighting') or ''
    if otsz_risk or otsz_seal or otsz_light:
        doc.add_heading('4. OTSZ előírások ellenőrzése (54/2014. BM rendelet)', level=1)
        doc.add_paragraph('Jelmagyarázat: MF = Megfelelő, NEM = Nem felel meg, NA = Nem alkalmazható.')
        otsz_table = doc.add_table(rows=4, cols=2)
        otsz_table.style = 'Table Grid'
        _style_table_header(otsz_table)
        otsz_table.rows[0].cells[0].text = 'Ellenőrzés'
        otsz_table.rows[0].cells[1].text = 'Minősítés'
        otsz_table.rows[1].cells[0].text = 'Kockázati (tűzveszélyességi) osztály megfelelősége'
        otsz_table.rows[1].cells[1].text = _visual_label(otsz_risk) if otsz_risk else '—'
        otsz_table.rows[2].cells[0].text = 'Gépészeti és villamos átvezetések tömítése (27.§)'
        otsz_table.rows[2].cells[1].text = _visual_label(otsz_seal) if otsz_seal else '—'
        otsz_table.rows[3].cells[0].text = 'Biztonsági világítás (56.–58., 113., 134., 146.–153.§)'
        otsz_table.rows[3].cells[1].text = _visual_label(otsz_light) if otsz_light else '—'
        doc.add_paragraph()
        section_num = 5
    else:
        section_num = 4

    # Visual Checklist (MEEVET / MSZ HD 60364-6)
    visual = c_data.get('visualChecks', {})
    if isinstance(visual, dict) and visual:
        doc.add_heading(f'{section_num}. Szemrevételezéses Ellenőrzések (6.4.2 MSZ HD 60364-6)', level=1)
        v_table = doc.add_table(rows=1, cols=2)
        v_table.style = 'Table Grid'
        _style_table_header(v_table)
        v_hdr = v_table.rows[0].cells
        v_hdr[0].text = 'Ellenőrzött pont'
        v_hdr[1].text = 'Minősítés'
        
        checks = [
            ('Azonosító jelek, feliratok megléte', visual.get('id_marks', 'ok')),
            ('Áramütés elleni védelem kialakítása', visual.get('protection', 'ok')),
            ('Tűzvédelmi óvintézkedések', visual.get('fire', 'ok')),
            ('Vezetők kiválasztása, terhelhetőség', visual.get('conduction', 'ok')),
            ('Csatlakozások, kötések megfelelősége', visual.get('connection', 'ok')),
            ('Karbantarthatóság, hozzáférhetőség', visual.get('access', 'ok'))
        ]
        for label, val in checks:
            v_row = v_table.add_row().cells
            v_row[0].text = label
            v_row[1].text = _visual_label(val)
        doc.add_paragraph()
        notes = visual.get('notes', '').strip() if isinstance(visual.get('notes'), str) else ''
        if notes:
            doc.add_paragraph('Megjegyzés (szemrevételezés):').bold = True
            doc.add_paragraph(notes)
        section_num += 1

    # Single-line Diagram (Egyvonalas rajz) — kihagyható, ha céges beállítás: docx_embed_diagram = False
    embed_diagram = getattr(settings, 'docx_embed_diagram', True) if settings else True
    if embed_diagram in (False, 0):
        embed_diagram = False
    else:
        embed_diagram = True
    diagram_b64 = getattr(report, 'diagram_image', None)
    if embed_diagram and diagram_b64 and diagram_b64.startswith('data:image'):
        doc.add_page_break()
        doc.add_heading(f'{section_num}. Egyvonalas Rajz (Áramkör Áttekintés)', level=1)
        doc.add_paragraph(
            'Az alábbi egyvonalas rajz a vizsgált villamos hálózat '
            'áramköri felépítését és az elosztók hierarchiáját mutatja be.'
        )
        try:
            # Handle data URL with or without metadata prefix
            if ',' in diagram_b64:
                b64_str = diagram_b64.split(',')[1]
            else:
                b64_str = diagram_b64
                
            raw = base64.b64decode(b64_str)
            img_bytes = _resize_image_bytes(raw, max_width_px=1920)
            
            # Add image with center alignment
            diag_p = doc.add_paragraph()
            diag_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            diag_run = diag_p.add_run()
            # Scaling to fit page width (16cm) while maintaining aspect ratio
            diag_run.add_picture(img_bytes, width=Cm(16))
            
            doc.add_paragraph() # Spacer
            section_num += 1
        except Exception as e:
            print(f"Error embedding diagram: {e}")
            doc.add_paragraph(f"[Hiba a rajz beillesztésekor: {str(e)}]")

    # EPH Specific Data — jelenjen meg VBF jegyzőkönyvekben is, ha ki van töltve
    has_eph_fields = any(
        c_data.get(key)
        for key in ["ephGasRequired", "ephGasMeter", "ephPenSep", "ephEarthMethod", "ephRaValue", "ephConductor"]
    )
    if rep_type == "EPH" or has_eph_fields:
        doc.add_heading(f'{section_num}. EPH és Földelés Specifikus Adatok', level=1)
        p3 = doc.add_paragraph()
        p3.add_run('Gázszolgáltató (Gázmérő) bevonása szükséges: ').bold = True
        p3.add_run(c_data.get('ephGasRequired', 'Nem') + '\n')
        
        p3.add_run('Gázmérő gyári száma: ').bold = True
        p3.add_run(c_data.get('ephGasMeter', 'N/A') + '\n')
        
        p3.add_run('PE-N Szétválasztás Helye: ').bold = True
        p3.add_run(c_data.get('ephPenSep', 'N/A') + '\n')
        
        p3.add_run('Földelési Ellenállás Mérési Módszer: ').bold = True
        p3.add_run(c_data.get('ephEarthMethod', 'N/A') + '\n')
        
        p3.add_run('Mért Földelési Ellenállás (Ra): ').bold = True
        p3.add_run(c_data.get('ephRaValue', 'N/A') + ' Ω\n')
        
        p3.add_run('EPH Fővezeték Keresztmetszete: ').bold = True
        p3.add_run(c_data.get('ephConductor', 'N/A') + ' mm²\n')
        p_eph_note = doc.add_paragraph()
        p_eph_note.add_run(
            'Az EPH rendszer célja a megérinthető fémrészek és a védővezető közötti potenciálkülönbség '
            'megfelelő határon tartása (MSZ HD 60364-4-41 §411.3.1.2); normál körülmények között '
            'a megengedett érintési feszültség 25 V AC (vagy 60 V DC) alatti tartása ajánlott.'
        )
        for r in p_eph_note.runs:
            r.font.italic = True
            r.font.size = Pt(10)
        section_num += 1
    
    # Measurements
    meas_data = report.measurements_data[0] if report.measurements_data and len(report.measurements_data) > 0 else {}
    if not isinstance(meas_data, dict):
        meas_data = {}
    if meas_data:
        doc.add_heading(f'{section_num}. Mérési Eredmények', level=1)
        sub_num = 1
        
        # VBF Measurements
        if rep_type.startswith("VBF") or rep_type == "VVF":
            # RPE
            rpe_list = meas_data.get('rpe', [])
            if rpe_list:
                doc.add_heading(f'{section_num}.{sub_num} Védővezető folytonosság (Rpe)', level=2)
                _add_std_ref(doc, 'MSZ HD 60364-6:2017 6.4.3.2 (vezetők folytonossága)')
                table = doc.add_table(rows=1, cols=4)
                table.style = 'Table Grid'
                _style_table_header(table)
                hdr = table.rows[0].cells
                hdr[0].text = 'Pont'
                hdr[1].text = 'Mérés Helye'
                hdr[2].text = 'Rpe [Ω]'
                hdr[3].text = 'Megfelel'
                for r in rpe_list:
                    row = table.add_row().cells
                    row[0].text = r.get('point', '')
                    row[1].text = r.get('loc', '')
                    row[2].text = r.get('val', '')
                    row[3].text = r.get('pass', '')
                sub_num += 1
                doc.add_paragraph()
            
            # Insulation
            ins_list = meas_data.get('insulation', [])
            if ins_list:
                doc.add_heading(f'{section_num}.{sub_num} Szigetelési ellenállás (500V DC)', level=2)
                _add_std_ref(doc, 'MSZ HD 60364-6:2017 6.4.3.3 (szigetelési ellenállás); mérőfeszültség 500 V DC, min. 1 MΩ')
                table = doc.add_table(rows=1, cols=5)
                table.style = 'Table Grid'
                _style_table_header(table)
                hdr = table.rows[0].cells
                hdr[0].text = 'Áramkör'
                hdr[1].text = 'Riso L-N [MΩ]'
                hdr[2].text = 'Riso L-PE [MΩ]'
                hdr[3].text = 'Riso N-PE [MΩ]'
                hdr[4].text = 'Megfelel'
                for r in ins_list:
                    row = table.add_row().cells
                    row[0].text = r.get('circuit', '')
                    row[1].text = r.get('ln', '')
                    row[2].text = r.get('lpe', '')
                    row[3].text = r.get('npe', '')
                    row[4].text = r.get('pass', '')
                sub_num += 1
                doc.add_paragraph()
            
            # Loop
            loop_list = meas_data.get('loop', [])
            if loop_list:
                doc.add_heading(f'{section_num}.{sub_num} Hurokellenállás (Zs) és Hibavédelem', level=2)
                _add_std_ref(doc, 'MSZ HD 60364-6:2017 6.4.3.7 (táplálás önműködő lekapcsolása); Zs ≤ (U₀×0,95)/Ia')
                table = doc.add_table(rows=1, cols=5)
                table.style = 'Table Grid'
                _style_table_header(table)
                hdr = table.rows[0].cells
                hdr[0].text = 'Áramkör / Pont'
                hdr[1].text = 'Kikapcsoló szerv'
                hdr[2].text = 'Hely (X/n)'
                hdr[3].text = 'Zs [Ω]'
                hdr[4].text = 'Megfelel'
                for r in loop_list:
                    row = table.add_row().cells
                    row[0].text = r.get('circuit', '')
                    row[1].text = r.get('device', '')
                    row[2].text = r.get('loc', '')
                    row[3].text = r.get('zs', '')
                    row[4].text = r.get('pass', '')
                sub_num += 1
                doc.add_paragraph()
            
            # RCD
            rcd_list = meas_data.get('rcd', [])
            if rcd_list:
                doc.add_heading(f'{section_num}.{sub_num} FI-relé (ÁVK) részletes vizsgálat', level=2)
                _add_std_ref(doc, 'MSZ HD 60364-6:2017 6.4.3.7 (ÁVK vizsgálat). 0,5×IΔn: kioldás nem megengedett; 1× és 5×IΔn: kioldási idő ≤ 300 ms (ált.) vagy ≤ 40 ms (perszonális védelem).')
                table = doc.add_table(rows=1, cols=9)
                table.style = 'Table Grid'
                _style_table_header(table)
                hdr = table.rows[0].cells
                hdr[0].text = 'Áramkör'
                hdr[1].text = 'Típus'
                hdr[2].text = 'IΔn [mA]'
                hdr[3].text = '0.5xIΔn'
                hdr[4].text = '1xIΔn [ms]'
                hdr[5].text = '5xIΔn [ms]'
                hdr[6].text = 'IΔ [mA]'
                hdr[7].text = 'Uc [V]'
                hdr[8].text = 'Megfelel'
                for r in rcd_list:
                    row = table.add_row().cells
                    row[0].text = str(r.get('circ', ''))
                    row[1].text = str(r.get('type', ''))
                    row[2].text = str(r.get('idn', ''))
                    row[3].text = str(r.get('test05', ''))
                    row[4].text = str(r.get('t1', ''))
                    row[5].text = str(r.get('t5', ''))
                    row[6].text = str(r.get('ramp', ''))
                    row[7].text = str(r.get('uc', ''))
                    row[8].text = str(r.get('pass', ''))
                sub_num += 1
                doc.add_paragraph()
                
            # Handheld Tools (M3)
            tools_list = meas_data.get('tools', [])
            if tools_list:
                doc.add_heading(f'{section_num}.{sub_num} Kéziszerszámok vizsgálata', level=2)
                _add_std_ref(doc, 'MEE Kézikönyv M3–M4; MSZ EN 60745-1 (kéziszerszámok); szig. ell. ≥ 2 MΩ II. osztály')
                table = doc.add_table(rows=1, cols=4)
                table.style = 'Table Grid'
                _style_table_header(table)
                hdr = table.rows[0].cells
                hdr[0].text = 'Megnevezés'
                hdr[1].text = 'Azonosító'
                hdr[2].text = 'Szig. ell. [MΩ]'
                hdr[3].text = 'Megfelel'
                for r in tools_list:
                    row = table.add_row().cells
                    row[0].text = r.get('name', '')
                    row[1].text = r.get('id', '')
                    row[2].text = r.get('val', '')
                    row[3].text = r.get('pass', '')
                sub_num += 1
                doc.add_paragraph()

            # SELV/PELV (M2)
            selv_list = meas_data.get('selv', [])
            if selv_list:
                doc.add_heading(f'{section_num}.{sub_num} SELV / PELV / Elválasztás', level=2)
                _add_std_ref(doc, 'MSZ HD 60364-6:2017 6.4.3.4 (SELV, PELV, villamos elválasztás); MSZ HD 60364-4-41 §414')
                table = doc.add_table(rows=1, cols=6)
                table.style = 'Table Grid'
                _style_table_header(table)
                hdr = table.rows[0].cells
                hdr[0].text = 'Hely / Áttétel'
                hdr[1].text = 'V [V]'
                hdr[2].text = 'P-S [MΩ]'
                hdr[3].text = 'P-T [MΩ]'
                hdr[4].text = 'S-T [MΩ]'
                hdr[5].text = 'Megfelel'
                for r in selv_list:
                    row = table.add_row().cells
                    row[0].text = r.get('loc', '')
                    row[1].text = r.get('v', '')
                    row[2].text = r.get('ps', '')
                    row[3].text = r.get('pt', '')
                    row[4].text = r.get('st', '')
                    row[5].text = r.get('pass', '')
                sub_num += 1
                doc.add_paragraph()

            # Polaritás (6.4.3.6), Fázissorrend (6.4.3.9), Feszültségesés (6.4.3.11)
            polarity = c_data.get('polarityCheck') or 'na'
            phase_seq = c_data.get('phaseSequenceCheck') or 'na'
            voltage_drop = c_data.get('voltageDropCheck') or 'na'
            if polarity != 'na' or phase_seq != 'na' or voltage_drop != 'na':
                doc.add_heading(f'{section_num}.{sub_num} Polaritás, fázissorrend, feszültségesés', level=2)
                _add_std_ref(doc, 'MSZ HD 60364-6:2017 6.4.3.6 (polaritás), 6.4.3.9 (fázissorrend), 6.4.3.11 (feszültségesés)')
                aux_table = doc.add_table(rows=4, cols=2)
                aux_table.style = 'Table Grid'
                _style_table_header(aux_table)
                aux_table.rows[0].cells[0].text = 'Ellenőrzés'
                aux_table.rows[0].cells[1].text = 'Minősítés'
                aux_table.rows[1].cells[0].text = 'Polaritás (N/PE, foglalatok) — 6.4.3.6'
                aux_table.rows[1].cells[1].text = _visual_label(polarity)
                aux_table.rows[2].cells[0].text = 'Fázissorrend (L1–L2–L3) — 6.4.3.9'
                aux_table.rows[2].cells[1].text = _visual_label(phase_seq)
                aux_table.rows[3].cells[0].text = 'Feszültségesés — 6.4.3.11'
                aux_table.rows[3].cells[1].text = _voltage_drop_label(voltage_drop)
                sub_num += 1
                doc.add_paragraph()
                
        elif rep_type == "EPH":
            eph_list = meas_data.get('eph_cont', [])
            if eph_list:
                doc.add_heading(f'{section_num}.{sub_num} EPH Bekötések Folytonossága', level=2)
                _add_std_ref(doc, 'MSZ HD 60364-5-54:2011 §544 (EPH); MSZ HD 60364-4-41 §411.3.1.2; 40/2017. (XII.4.) NGM 6.§')
                table = doc.add_table(rows=1, cols=7)
                table.style = 'Table Grid'
                _style_table_header(table)
                hdr = table.rows[0].cells
                hdr[0].text = 'Sorszám'
                hdr[1].text = 'Bekötött Elem'
                hdr[2].text = 'Hely'
                hdr[3].text = 'Vezető (Keresztm.)'
                hdr[4].text = 'Kötés módja'
                hdr[5].text = 'Folytonosság [Ω]'
                hdr[6].text = 'Megfelel'
                for r in eph_list:
                    row = table.add_row().cells
                    row[0].text = str(r.get('idx', ''))
                    row[1].text = str(r.get('elem', ''))
                    row[2].text = str(r.get('loc', ''))
                    row[3].text = str(r.get('mat', ''))
                    row[4].text = str(r.get('conn', ''))
                    row[5].text = str(r.get('val', ''))
                    row[6].text = str(r.get('pass', ''))
                sub_num += 1
                doc.add_paragraph()

        # Print photos attached to measurement circuits
        meas_photos = []
        for m_key in ['rpe', 'insulation', 'loop', 'rcd', 'tools', 'selv', 'eph_cont']:
            items = meas_data.get(m_key, [])
            if not isinstance(items, list):
                continue
            for m_row in items:
                if not isinstance(m_row, dict):
                    continue
                p_data = m_row.get('photo')
                if p_data and isinstance(p_data, str) and p_data.startswith('data:image'):
                    desc = "Mérés Kép"
                    if m_key == 'rpe':
                        desc = f"Védővezető Rpe - {m_row.get('loc', '')}"
                    elif m_key == 'insulation':
                        desc = f"Szigetelés - {m_row.get('circuit', '')}"
                    elif m_key == 'loop':
                        desc = f"Hurokellenállás - {m_row.get('circuit', '')} ({m_row.get('loc', '')})"
                    elif m_key == 'rcd':
                        desc = f"Fi-Relé - {m_row.get('circ', '')}"
                    elif m_key == 'tools':
                        desc = f"Kéziszerszám - {m_row.get('name', '')}"
                    elif m_key == 'selv':
                        desc = f"SELV - {m_row.get('loc', '')}"
                    elif m_key == 'eph_cont':
                        desc = f"EPH - {m_row.get('elem', '')} ({m_row.get('loc', '')})"
                    meas_photos.append((desc, p_data))
                    
        if meas_photos:
            doc.add_heading(f'{section_num}. Mérési Áramkörökhöz / Sorokhoz csatolt fényképek', level=1)
            for desc, photo_data in meas_photos:
                try:
                    b64_str = photo_data.split(',')[1]
                    raw = base64.b64decode(b64_str)
                    img_bytes = _resize_image_bytes(raw, max_width_px=1280)
                    doc.add_paragraph(f"{desc}:").bold = True
                    doc.add_paragraph().add_run().add_picture(img_bytes, width=Cm(12))
                except Exception as e:
                    doc.add_paragraph(f"[Hiba a mérés képének beillesztésekor: {str(e)}]")
        section_num += 1
        doc.add_paragraph()

    # Defects - MEE Kézikönyv szerinti kategorizálás
    doc.add_heading(f'{section_num}. Feltárt Hibák és Hiányosságok', level=1)
    
    # MEE severity legend
    sev_legend = doc.add_paragraph()
    sev_legend.add_run("Hibakategóriák a MEE Kézikönyv szerint:\n").bold = True
    sev_legend.add_run("(A) Közvetlen élet- és tűzveszély  ")
    sev_legend.add_run("(B) Súlyos hiba (soron kívül javítandó)  ")
    sev_legend.add_run("(C) Karbantartási hiba  ")
    sev_legend.add_run("(D) Felújításkor javítandó\n")
    
    d_data = report.defects_data or []
    if not d_data:
        doc.add_paragraph("A vizsgálat során nem tártunk fel hibát vagy hiányosságot.")
    else:
        for idx, defect in enumerate(d_data, 1):
            # A súlyosságot és MEE-kategóriát a domain logika tölti ki a report.defects_data-ban.
            # A generátor csak megjeleníti ezeket.
            mee_code = defect.get("meeCode") or defect.get("mee_code") or ""
            mee_title = defect.get("meeTitle") or defect.get("mee_title") or ""

            # Prezentációs szín (nem jogi logika): severity érték alapján egyszerű mapping.
            sev_raw = (defect.get("severity") or "").upper()
            if sev_raw in ("CRITICAL", "HIGH"):
                sev_color = RGBColor(255, 0, 0)
            elif sev_raw == "MEDIUM":
                sev_color = RGBColor(255, 80, 0)
            elif sev_raw == "LOW":
                sev_color = RGBColor(255, 140, 0)
            else:
                sev_color = RGBColor(128, 128, 128)

            heading_label = f"Hiba #{idx}"
            if mee_code or mee_title:
                heading_label += f" — {mee_code} {mee_title}".strip()
            doc.add_heading(heading_label, level=2)
            dp = doc.add_paragraph()

            # Severity badge
            badge = mee_code or sev_raw or ""
            if badge:
                sev_run = dp.add_run(f"[{badge}] ")
                sev_run.bold = True
                sev_run.font.color.rgb = sev_color

            dp.add_run("Leírás és Javaslat:\n").bold = True
            dp.add_run(defect.get('description', 'N/A') + "\n\n")

            # Ajánlott javítási szöveg: domain által előre kitöltve (repairSuggestion),
            # itt csak fallbackelünk egy általános szöveggel.
            repair_text = defect.get('repairSuggestion', '')
            if not repair_text or not str(repair_text).strip():
                repair_text = 'A hibához illeszkedő szakszerű javítás végrehajtása a vonatkozó szabványok szerint.'
            dp.add_run("Javasolt javítási lépések (MSZ alapján): ").bold = True
            dp.add_run(repair_text + "\n\n")

            dp.add_run("Pontos Helyszín: ").bold = True
            dp.add_run(defect.get('location', 'N/A') + "\n")
            
            # Szabvány hivatkozás - domain által megadva, itt csak általános fallback.
            dp.add_run("Szabvány hivatkozás: ").bold = True
            std_ref = defect.get('standard', '') or ''
            if not std_ref.strip():
                std_ref = 'MSZ HD 60364-6:2017 (Villamos berendezések felülvizsgálata); vonatkozó VMBSZ/OTSZ előírások.'
            dp.add_run(std_ref + "\n")
            
            dp.add_run("Javasolt javítási határidő: ").bold = True
            run = dp.add_run(defect.get('deadline', 'N/A'))
            run.font.color.rgb = RGBColor(255, 0, 0)
            
            # Photo insertion
            photo_data = defect.get('photo')
            if photo_data and isinstance(photo_data, str) and photo_data.startswith('data:image'):
                try:
                    # remove data:image/jpeg;base64, prefix
                    b64_str = photo_data.split(',')[1]
                    raw = base64.b64decode(b64_str)
                    img_bytes = _resize_image_bytes(raw, max_width_px=1280)
                    doc.add_paragraph("Fényképes dokumentáció:").bold = True
                    doc.add_paragraph().add_run().add_picture(img_bytes, width=Cm(12))
                except Exception as e:
                    doc.add_paragraph(f"[Hiba a kép beillesztésekor: {str(e)}]")
    
    section_num += 1
            
    # Result - MEE Handbook Minősítő Irat Változat kezelése
    doc.add_heading(f'{section_num}. Összefoglaló Minősítés (MEE Handbook)', level=1)
    res_p = doc.add_paragraph()
    r_val = c_data.get('reportResult', c_data.get('meeQualification', 'N/A'))
    
    # MEE Handbook változat szerinti leírás és szín
    mee_descriptions = {
        'MEGFELELŐ': ('MEGFELELŐ', 'A vizsgált villamos berendezés / rendszer az érvényes szabványoknak és előírásoknak megfelel. Hibát nem tártunk fel. Az üzemeltetés folytatható.', RGBColor(0, 128, 0)),
        'VÁLTOZAT_C': ('C VÁLTOZAT – MEGFELELŐ (kisebb hibákkal)', 'A vizsgált villamos berendezés az MSZ HD 60364 szerint alapvetően megfelelő, azonban kisebb eltérések / hibák kerültek megállapításra, amelyek azonnali veszélyt nem jelentenek. A hibák kijavítása ajánlott a következő időszakos felülvizsgálatig.', RGBColor(255, 140, 0)),
        'VÁLTOZAT_B': ('B VÁLTOZAT – FELTÉTELESEN MEGFELELŐ', 'Súlyos hiba(k) kerültek feltárásra. A hibák kijavítása kötelező! Az ismételt ellenőrzés a javítás elvégzése után szükséges. A berendezés a hibák kijavításáig csak fokozott felügyelet mellett üzemeltethető.', RGBColor(255, 80, 0)),
        'VÁLTOZAT_A': ('A VÁLTOZAT – PÓTLÓLAGOS ELLENŐRZÉS SZÜKSÉGES', 'Az érintésvédelmi berendezés a feltárt hibák kijavítása után ismételt, teljes körű ellenőrzésre szorul. A berendezés üzembiztos állapotba hozása és az ismételt felülvizsgálat elvégzése a tulajdonos / üzemeltető felelőssége.', RGBColor(200, 0, 0)),
        'NEM MEGFELELŐ': ('NEM MEGFELELŐ – KÖZVETLEN VESZÉLY', 'A vizsgált villamos berendezés közvetlen élet- és/vagy tűzveszélyes állapotban van! Az azonnali üzemen kívül helyezés és a szakszerű javítás KÖTELEZŐ! A berendezés további üzemeltetése tilos.', RGBColor(255, 0, 0)),
    }
    
    title_text, desc_text, color = mee_descriptions.get(r_val, (r_val, '', RGBColor(128, 128, 128)))
    
    res_run = res_p.add_run(title_text)
    res_run.bold = True
    res_run.font.size = Pt(14)
    res_run.font.color.rgb = color
    
    if desc_text:
        res_p.add_run('\n\n')
        desc_run = res_p.add_run(desc_text)
        desc_run.font.size = Pt(11)
        
    disclaimer = (
        "Módszertan és Felelősség:\n"
        "Az ellenőrzés csak a szemrevételezéssel és jelentős bontás nélkül megközelíthető részekre, "
        "valamint a vonatkozó szabványban (MSZ HD 60364-6) rögzített tesztpontokon végzett műszeres mérésekre terjedt ki. "
        "A rejtett, falban vagy vezetékcsatornában húzódó, elburkolt szerelvények és vezetékek állapota, azok esetleges "
        "szemmel láthatatlan vagy roncsolás nélkül nem vizsgálható hibái a jelenlegi felülvizsgálat során teljes bizonyossággal nem állapíthatók meg.\n\n"
        "A minősítés és a feltárt hibák dokumentálása a felülvizsgálat időpontjában érvényes jogszabályok "
        "alapján történt. A feltárt hibák szakszerű, villamosipari szakember "
        "által történő kijavításáról, valamint a hálózat folyamatos, rendeltetésszerű karbantartásáról az Üzemeltető / Tulajdonos "
        "köteles gondoskodni a VMBSZ rendeletei értelmében.\n\n"
        "Jelen jegyzőkönyv a kiállítás dátumától számított, a vonatkozó rendelet szerinti időszakos "
        "felülvizsgálati határnapig (vagy a berendezés, hálózat átalakításáig) érvényes. "
        "A jegyzőkönyv papír alapú aláírás és a felülvizsgáló bélyegzője nélkül is teljes bizonyító erejű elektronikus okiratnak minősül, amennyiben a "
        "visszakövethető informatikai rendszerből, lezárt és véglegesített (titkosított) formában kerül kiadásra, generálásra."
    )
    p_disc = doc.add_paragraph(disclaimer)
    p_disc.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    # ═══════════════════════════════════════════════════════
    # DIGITÁLIS INTEGRITÁS - QR Kód és Hash
    # ═══════════════════════════════════════════════════════
    doc.add_heading(f'{section_num}. Digitális Integritás és Nyomonkövethetőség', level=1)
    
    # Payload for hashing (valódi mérési számok report.measurements_data-ból)
    meas_for_hash = report.measurements_data[0] if report.measurements_data and len(report.measurements_data) > 0 else {}
    if not isinstance(meas_for_hash, dict):
        meas_for_hash = {}
    integrity_data = {
        'report_id': rep_id_str,
        'title': (report.title or '').strip(),
        'client': c_data.get('customerName', c_data.get('clientName', '')),
        'address': c_data.get('siteAddress', ''),
        'inspection_date': (c_data.get('inspectionDate') or '').strip(),
        'inspector': c_data.get('inspectorName', ''),
        'instrument': c_data.get('instrumentType', ''),
        'calibration': c_data.get('instrumentCal', ''),
        'result': r_val,
        'issued': datetime.now().isoformat(),
        'measurement_count': {
            'rpe': len(meas_for_hash.get('rpe', [])),
            'riso': len(meas_for_hash.get('insulation', [])),
            'loop': len(meas_for_hash.get('loop', [])),
            'rcd': len(meas_for_hash.get('rcd', [])),
        },
        'defect_count': len(d_data),
    }
    
    # SHA-256 hash a tartalomra
    payload_json = json.dumps(integrity_data, ensure_ascii=False, sort_keys=True)
    content_hash = hashlib.sha256(payload_json.encode('utf-8')).hexdigest()
    integrity_data['sha256'] = content_hash
    
    # QR kód payload
    qr_payload = json.dumps({
        'id': rep_id_str,
        'hash': content_hash[:16],  # Első 16 karakter (ellenőrzéshez elég)
        'date': datetime.now().strftime('%Y-%m-%d'),
        'result': r_val,
        'inspector': c_data.get('inspectorName', '')[:30],
    }, ensure_ascii=False)
    
    # QR kód generálás
    try:
        qr = qrcode.QRCode(version=1, box_size=6, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(qr_payload)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        # QR kód beillesztése
        qr_para = doc.add_paragraph()
        qr_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        qr_run = qr_para.add_run()
        qr_run.add_picture(qr_buffer, width=Cm(4))
        
        qr_label = doc.add_paragraph(f"Hitelesítési QR kód — Azonosító: {rep_id_str}")
        qr_label.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
    except ImportError:
        doc.add_paragraph("[QR kód generálás nem elérhető — telepítsd: pip install qrcode[pil]]")
    except Exception as e:
        doc.add_paragraph(f"[QR kód generálási hiba: {str(e)}]")
    
    # Integritási adatok szöveges formában
    int_p = doc.add_paragraph()
    int_p.add_run("Dokumentum Integritási Adatok:\n").bold = True
    int_p.add_run(f"Azonosító: {rep_id_str}\n")
    int_p.add_run(f"Generálás dátuma: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
    
    m_counts = integrity_data.get('measurement_count', {})
    rpe_c = m_counts.get('rpe', 0)
    riso_c = m_counts.get('riso', 0)
    loop_c = m_counts.get('loop', 0)
    rcd_c = m_counts.get('rcd', 0)
    
    int_p.add_run(f"SHA-256 Hash: {content_hash}\n")
    int_p.add_run(f"Mérések: Rpe={rpe_c} db, "
                  f"Riso={riso_c} db, "
                  f"Zs={loop_c} db, "
                  f"RCD={rcd_c} db\n")
    int_p.add_run(f"Feltárt hibák: {integrity_data.get('defect_count', 0)} db\n")
    
    hash_note = doc.add_paragraph(
        "A fenti SHA-256 hash a dokumentum minden lényeges adatából (megrendelő, cím, felülvizsgáló, "
        "műszer, mérési eredmények száma, hibák száma, minősítés) számított egyedi lenyomat. "
        "Bármilyen módosítás esetén a hash megváltozik, ezáltal a manipuláció kimutatható. "
        "A QR kód a hitelesítési adatokat tartalmazza."
    )
    hash_note.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    
    # Következő felülvizsgálat dátuma (client_data.nextInspectionDate vagy OTSZ alapján)
    next_insp_str = (c_data.get('nextInspectionDate') or '').strip()
    next_date = None
    if next_insp_str:
        try:
            next_date = datetime.strptime(next_insp_str, '%Y-%m-%d')
        except ValueError:
            next_date = None
    otsz_class = c_data.get('buildingOtsz', '')
    otsz_cycles = {'AK': 6, 'KK': 3, 'MK': 1, 'NAK': 6}
    if next_date is None and otsz_class and otsz_class in otsz_cycles:
        years = otsz_cycles[otsz_class]
        next_date = datetime.now().replace(year=datetime.now().year + years)
    if next_date:
        next_p = doc.add_paragraph()
        next_p.add_run(f"\n📅 KÖVETKEZŐ KÖTELEZŐ FELÜLVIZSGÁLAT: ").bold = True
        next_run = next_p.add_run(f"{next_date.strftime('%Y-%m-%d')}")
        next_run.bold = True
        next_run.font.size = Pt(14)
        next_run.font.color.rgb = RGBColor(255, 80, 0)
        if otsz_class and otsz_class in otsz_cycles:
            next_p.add_run(f"\n(OTSZ osztály: {otsz_class} → {otsz_cycles[otsz_class]} évente, 54/2014. BM rendelet)")
        else:
            next_p.add_run("\n(megadott / számított dátum)")
    
    # Végső példány megjegyzés (véglegesített jegyzőkönyv)
    if getattr(report, 'status', None) == 'FINAL':
        final_p = doc.add_paragraph()
        final_run = final_p.add_run('Végső példány — véglegesített jegyzőkönyv. Módosítás tilos.')
        final_run.bold = True
        final_run.font.color.rgb = RGBColor(180, 0, 0)
        final_run.font.size = Pt(11)
        final_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        doc.add_paragraph()

    # Aláírás: feltöltött kép (ha van), különben szöveges placeholder
    sig = doc.add_paragraph("\n\n..................................................\nAláírás és Bélyegző")
    sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    if settings and getattr(settings, 'signature_path', None) and os.path.exists(settings.signature_path):
            try:
                import io as _io
                with open(settings.signature_path, "rb") as f:
                    raw = f.read()
                sig_buf = _resize_image_bytes(raw, max_width_px=800)
                sig_para = doc.add_paragraph()
                sig_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                sig_run = sig_para.add_run()
                sig_run.add_picture(sig_buf, width=Cm(4.5))
            except Exception as e:
                logger.warning(f"Aláírás kép beillesztési hiba: {e}")
    
    # --- Függelék: Villanyszerelői Javítási Nyilatkozat (Opcionális panel) ---
    if "NEM MEGFELELŐ" in r_val or "FELTÉTELESEN" in r_val:
        doc.add_page_break()
        doc.add_heading('Függelék: Villanyszerelői Nyilatkozat a Javításról', level=1)
        
        rep_id_str_f = f"{rep_type}-{report.id}" if report.id else "TERVEZET"
        nyilatkozat_szoveg = (
            f"Alulírott ..................................................... (kivitelező/villanyszerelő neve/cége), "
            "mint megfelelő szakmai képesítéssel rendelkező villamos szakember (Fnyv. szám / bizonyítvány: ................................) "
            f"büntetőjogi felelősségem tudatában nyilatkozom, hogy a jelen, {rep_id_str_f} hivatkozási számú jegyzőkönyvben ("
            "vagy annak hibajegyzék mellékletében) rögzített feltárt hibákat és hiányosságokat a vonatkozó MSZ HD 60364 szabványsorozat előírásainak megfelelően "
            "szakszerűen, maradéktalanul kijavítottam.\n\n"
            "Kijelentem, hogy az általam elvégzett javítási munkálatok után a vizsgált villamos berendezés/hálózat áramütés elleni védelme, "
            "valamint szabványos állapota a biztonságos üzemeltetés feltételeinek maradéktalanul megfelel.\n\n"
        )
        j_p = doc.add_paragraph(nyilatkozat_szoveg)
        j_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        
        doc.add_paragraph("Javítás elvégzésének dátuma: 20... év ...................... hó ........ nap\n\n\n\n")
        
        j_sig = doc.add_paragraph("..................................................\nJavítást Végző Villanyszerelő aláírása")
        j_sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        if settings and getattr(settings, 'signature_path', None) and os.path.exists(settings.signature_path):
            try:
                import io as _io
                with open(settings.signature_path, "rb") as f:
                    raw = f.read()
                sig_buf = _resize_image_bytes(raw, max_width_px=800)
                j_sig_para = doc.add_paragraph()
                j_sig_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                j_sig_para.add_run().add_picture(sig_buf, width=Cm(4.5))
            except Exception as e:
                logger.warning(f"Javítás aláírás kép beillesztési hiba: {e}")

    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)
    return stream

import tempfile
import os
import sys


def generate_diagram_pdf_stream(report: Report) -> io.BytesIO:
    """
    Egyoldalas A4 PDF csak a rajz képből (diagram_image base64).
    A teljes jegyzőkönyv PDF-től külön, aláíratlan.
    """
    diagram_b64 = getattr(report, "diagram_image", None)
    if not diagram_b64 or not str(diagram_b64).strip().startswith("data:image"):
        raise ValueError("Nincs rajz kép a jegyzőkönyvben (diagram_image). Előbb mentsd a rajzot a jegyzőkönyvbe.")
    if "," in diagram_b64:
        b64_str = diagram_b64.split(",", 1)[1]
    else:
        b64_str = diagram_b64
    raw = base64.b64decode(b64_str)
    img_bytes = _resize_image_bytes(raw, max_width_px=1920)

    doc = Document()
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.left_margin = Cm(1.5)
    section.right_margin = Cm(1.5)
    section.top_margin = Cm(1.5)
    section.bottom_margin = Cm(1.5)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run()
    r.add_picture(img_bytes, width=Cm(16))

    docx_io = io.BytesIO()
    doc.save(docx_io)
    docx_io.seek(0)

    with tempfile.TemporaryDirectory() as td:
        docx_path = os.path.join(td, "diagram.docx")
        pdf_path = os.path.join(td, "diagram.pdf")
        with open(docx_path, "wb") as f:
            f.write(docx_io.getvalue())
        try:
            if sys.platform == "win32":
                from docx2pdf import convert
                convert(docx_path, pdf_path)
            else:
                import subprocess
                subprocess.run(
                    ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", td, docx_path],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
            out = io.BytesIO(pdf_bytes)
            out.seek(0)
            return out
        except Exception as e:
            logger.warning(f"Rajz PDF konverzió hiba: {e}")
            raise RuntimeError(f"Rajz PDF generálás sikertelen: {e}") from e


def generate_signed_pdf_stream(report: Report, db=None, pfx_path: Optional[str] = None, pfx_pass: Optional[bytes] = None, share_url: Optional[str] = None) -> io.BytesIO:
    # PFX: először megadott path/jelszó, majd céges beállítások, végül alapértelmezett
    if pfx_path is None and db and report.owner_id:
        owner = db.query(database.User).filter(database.User.id == report.owner_id).first()
        if owner and getattr(owner, "company_id", None):
            settings = db.query(database.CompanySettings).filter(
                database.CompanySettings.company_id == owner.company_id
            ).first()
        else:
            settings = db.query(database.CompanySettings).filter(
                database.CompanySettings.owner_id == report.owner_id
            ).first()
        if settings and getattr(settings, "pfx_path", None) and os.path.exists(settings.pfx_path):
            pfx_path = settings.pfx_path
    if pfx_path is None:
        pfx_path = "signer.pfx"
    if pfx_pass is None:
        import os as _os
        env_pass = _os.environ.get("VBF_PFX_PASSWORD")
        if not env_pass:
            raise RuntimeError("VBF_PFX_PASSWORD is not set – PDF aláírás nem végezhető biztonságosan.")
        pfx_pass = env_pass.encode("utf-8")

    # Generate the standard DOCX (share_url → QR borítólapra)
    docx_stream = generate_docx_stream(report, db, share_url=share_url)

    with tempfile.TemporaryDirectory() as td:
        docx_path = os.path.join(td, "temp.docx")
        pdf_path = os.path.join(td, "temp.pdf")
        with open(docx_path, "wb") as f:
            f.write(docx_stream.getvalue())

        try:
            import subprocess
            import sys

            if sys.platform == "win32":
                from docx2pdf import convert
                convert(docx_path, pdf_path)
            else:
                subprocess.run(
                    ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", td, docx_path],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )

            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()

            from pyhanko.sign import signers
            from pyhanko.pdf_utils.reader import PdfFileReader
            from pyhanko.pdf_utils.writer import copy_into_new_writer
            import io as pyhanko_io

            if not os.path.exists(pfx_path):
                pdf_out = pyhanko_io.BytesIO(pdf_bytes)
                pdf_out.seek(0)
                return pdf_out

            signer = signers.SimpleSigner.load_pkcs12(pfx_path, pfx_pass)
            
            r = PdfFileReader(pyhanko_io.BytesIO(pdf_bytes))
            w = copy_into_new_writer(r)
            pdf_out = pyhanko_io.BytesIO()
            
            # Sign and save
            signers.sign_pdf(
                w, 
                signers.PdfSignatureMetadata(field_name='VBF_Signature'), 
                signer=signer, 
                in_place=False, 
                existing_fields_only=False, 
                bytes_reserved=8192,
                out=pdf_out
            )
            
            pdf_out.seek(0)
            return pdf_out
            
        except Exception as e:
            print(f"Hiba a PDF generálása vagy aláírása során: {e}")
            raise RuntimeError(f"PDF generálási hiba: {e}") from e
