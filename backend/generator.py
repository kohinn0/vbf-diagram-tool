import io
import base64
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import Report

def generate_docx_stream(report: Report) -> io.BytesIO:
    doc = Document()
    
    # Header
    rep_type = report.report_type.upper() if report.report_type else "VBF"
    short_rep_type = "EPH" if rep_type == "EPH" else "VBF"
    
    if report.id and report.created_at:
        rep_id_str = f"{short_rep_type}-{report.created_at.year}-{report.id:03d}"
    else:
        rep_id_str = f"{short_rep_type}-TERVEZET"

    section = doc.sections[0]
    header = section.header
    if not header.paragraphs:
        header_para = header.add_paragraph()
    else:
        header_para = header.paragraphs[0]
    header_para.text = f"Jegyzőkönyv azonosító: {rep_id_str}"
    header_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    
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
        
    title = doc.add_heading(title_text, 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    subtitle = doc.add_heading("Hivatalos Minősítő Irat", level=1)
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Preamble / Bevezető
    doc.add_heading('1. Cél és Vonatkozó Jogszabályok', level=1)
    if rep_type == "VBF_IDOSZAKOS":
        szabvany_ref = "• MSZ 10900 és MSZ HD 60364-6:2017 – Kisfeszültségű villamos berendezések időszakos ellenőrzése\n"
    elif rep_type == "VBF_ELSO":
        szabvany_ref = "• MSZ HD 60364-6:2017 – Kisfeszültségű villamos berendezések első ellenőrzése\n"
    else:
        szabvany_ref = "• MSZ HD 60364-6:2017 / MSZ 10900 – Érintésvédelmi felülvizsgálatok\n"

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

    # Client Data
    doc.add_heading('2. Alapadatok és Helyszín', level=1)
    c_data = report.client_data or {}
    
    p = doc.add_paragraph()
    p.add_run('Megrendelő / Üzemeltető: ').bold = True
    p.add_run(c_data.get('customerName', 'N/A') + '\n')
    
    p.add_run('Vizsgálat helyszíne: ').bold = True
    p.add_run(c_data.get('siteAddress', 'N/A') + '\n')
    
    p.add_run('Helyrajzi Szám (HRSZ) / Azonosító: ').bold = True
    p.add_run(c_data.get('siteHrsz', 'N/A') + '\n')
    
    p.add_run('Épület rendeltetése (OTSZ): ').bold = True
    p.add_run(c_data.get('buildingPurpose', 'N/A') + '\n')
    
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

    # Visual Checklist (MEEVET / MSZ HD 60364-6)
    section_num = 4
    visual = c_data.get('visualChecks', {})
    if isinstance(visual, dict) and visual:
        doc.add_heading(f'{section_num}. Szemrevételezéses Ellenőrzések (6.4.2 MSZ HD 60364-6)', level=1)
        v_table = doc.add_table(rows=1, cols=2)
        v_table.style = 'Table Grid'
        v_hdr = v_table.rows[0].cells
        v_hdr[0].text = 'Ellenőrzött pont'
        v_hdr[1].text = 'Minősítés'
        
        checks = [
            ('Azonosító jelek, feliratok megléte', visual.get('id_marks', False)),
            ('Áramütés elleni védelem kialakítása', visual.get('protection', False)),
            ('Tűzvédelmi óvintézkedések', visual.get('fire', False)),
            ('Vezetők kiválasztása, terhelhetőség', visual.get('conduction', False)),
            ('Csatlakozások, kötések megfelelősége', visual.get('connection', False)),
            ('Karbantarthatóság, hozzáférhetőség', visual.get('access', False))
        ]
        for label, val in checks:
            v_row = v_table.add_row().cells
            v_row[0].text = label
            v_row[1].text = "Megfelelő" if val else "Nem felel meg / Nem vizsgált"
        doc.add_paragraph()
        section_num += 1

    # EPH Specific Data
    if rep_type == "EPH":
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
                table = doc.add_table(rows=1, cols=4)
                table.style = 'Table Grid'
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
                table = doc.add_table(rows=1, cols=5)
                table.style = 'Table Grid'
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
                table = doc.add_table(rows=1, cols=5)
                table.style = 'Table Grid'
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
                table = doc.add_table(rows=1, cols=9)
                table.style = 'Table Grid'
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
                table = doc.add_table(rows=1, cols=4)
                table.style = 'Table Grid'
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
                table = doc.add_table(rows=1, cols=6)
                table.style = 'Table Grid'
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
                
        elif rep_type == "EPH":
            eph_list = meas_data.get('eph_cont', [])
            if eph_list:
                doc.add_heading(f'{section_num}.{sub_num} EPH Bekötések Folytonossága', level=2)
                table = doc.add_table(rows=1, cols=7)
                table.style = 'Table Grid'
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
            if not isinstance(items, list): continue
            for m_row in items:
                if not isinstance(m_row, dict): continue
                p_data = m_row.get('photo')
                if p_data and isinstance(p_data, str) and p_data.startswith('data:image'):
                    desc = "Mérés Kép"
                    if m_key == 'rpe': desc = f"Védővezető Rpe - {m_row.get('loc', '')}"
                    elif m_key == 'insulation': desc = f"Szigetelés - {m_row.get('circuit', '')}"
                    elif m_key == 'loop': desc = f"Hurokellenállás - {m_row.get('circuit', '')} ({m_row.get('loc', '')})"
                    elif m_key == 'rcd': desc = f"Fi-Relé - {m_row.get('circ', '')}"
                    elif m_key == 'tools': desc = f"Kéziszerszám - {m_row.get('name', '')}"
                    elif m_key == 'selv': desc = f"SELV - {m_row.get('loc', '')}"
                    elif m_key == 'eph_cont': desc = f"EPH - {m_row.get('elem', '')} ({m_row.get('loc', '')})"
                    meas_photos.append((desc, p_data))
                    
        if meas_photos:
            doc.add_heading(f'{section_num}. Mérési Áramkörökhöz / Sorokhoz csatolt fényképek', level=1)
            for desc, photo_data in meas_photos:
                try:
                    b64_str = photo_data.split(',')[1]
                    img_bytes = io.BytesIO(base64.b64decode(b64_str))
                    doc.add_paragraph(f"{desc}:").bold = True
                    doc.add_paragraph().add_run().add_picture(img_bytes, width=Cm(12))
                except Exception as e:
                    doc.add_paragraph(f"[Hiba a mérés képének beillesztésekor: {str(e)}]")
            section_num = int(section_num) + 1
            
        section_num = int(section_num) + 1

    # Defects
    doc.add_heading(f'{section_num}. Feltárt Hibák és Hiányosságok', level=1)
    d_data = report.defects_data or []
    if not d_data:
        doc.add_paragraph("A vizsgálat során nem tártunk fel hibát vagy hiányosságot.")
    else:
        for idx, defect in enumerate(d_data, 1):
            doc.add_heading(f"Hiba #{idx}", level=2)
            dp = doc.add_paragraph()
            
            dp.add_run("Leírás és Javaslat:\n").bold = True
            dp.add_run(defect.get('description', 'N/A') + "\n\n")
            
            dp.add_run("Pontos Helyszín: ").bold = True
            dp.add_run(defect.get('location', 'N/A') + "\n")
            
            dp.add_run("Szabvány hivatkozás: ").bold = True
            dp.add_run(defect.get('standard', 'N/A') + "\n")
            
            dp.add_run("Javasolt javítási határidő: ").bold = True
            run = dp.add_run(defect.get('deadline', 'N/A'))
            run.font.color.rgb = RGBColor(255, 0, 0) # Highlight deadline
            
            # Photo insertion
            photo_data = defect.get('photo')
            if photo_data and photo_data.startswith('data:image'):
                try:
                    # remove data:image/jpeg;base64, prefix
                    b64_str = photo_data.split(',')[1]
                    img_bytes = io.BytesIO(base64.b64decode(b64_str))
                    doc.add_paragraph("Fényképes dokumentáció:").bold = True
                    doc.add_paragraph().add_run().add_picture(img_bytes, width=Cm(12))
                except Exception as e:
                    doc.add_paragraph(f"[Hiba a kép beillesztésekor: {str(e)}]")
    
    section_num += 1
            
    # Result
    doc.add_heading(f'{section_num}. Összefoglaló Minősítés', level=1)
    res_p = doc.add_paragraph()
    r_val = c_data.get('reportResult', 'N/A')
    res_run = res_p.add_run(r_val)
    res_run.bold = True
    res_run.font.size = Pt(14)
    if "NEM MEGFELELŐ" in r_val and "FELTÉTELESEN" not in r_val:
        res_run.font.color.rgb = RGBColor(255, 0, 0)
    elif "FELTÉTELESEN" in r_val:
        res_run.font.color.rgb = RGBColor(255, 140, 0)
    else:
        res_run.font.color.rgb = RGBColor(0, 128, 0)
        
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
    
    # Signature placeholder
    sig = doc.add_paragraph("\n\n..................................................\nAláírás és Bélyegző")
    sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    
    # --- Függelék: Villanyszerelői Javítási Nyilatkozat (Opcionális panel) ---
    if "NEM MEGFELELŐ" in r_val or "FELTÉTELESEN" in r_val:
        doc.add_page_break()
        doc.add_heading('Függelék: Villanyszerelői Nyilatkozat a Javításról', level=1)
        
        rep_id_str = f"{rep_type}-{report.id}" if report.id else "TERVEZET"
        nyilatkozat_szoveg = (
            "Alulírott ..................................................... (kivitelező/villanyszerelő neve/cége), "
            "mint megfelelő szakmai képesítéssel rendelkező villamos szakember (Fnyv. szám / bizonyítvány: ................................) "
            f"büntetőjogi felelősségem tudatában nyilatkozom, hogy a jelen, {rep_id_str} hivatkozási számú jegyzőkönyvben ("
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

    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)
    return stream

import tempfile
import os

def generate_signed_pdf_stream(report: Report, pfx_path: str = "signer.pfx", pfx_pass: bytes = b'password') -> io.BytesIO:
    # Generate the standard DOCX
    docx_stream = generate_docx_stream(report)
    
    with tempfile.TemporaryDirectory() as td:
        docx_path = os.path.join(td, "temp.docx")
        pdf_path = os.path.join(td, "temp.pdf")
        with open(docx_path, "wb") as f:
            f.write(docx_stream.getvalue())
            
        try:
            import subprocess
            import sys
            
            if sys.platform == "win32":
                # Check if docx2pdf works
                from docx2pdf import convert
                convert(docx_path, pdf_path)
            else:
                # Use LibreOffice Headless inside Docker
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
                # Return unsigned PDF if cert is missing
                pdf_out = pyhanko_io.BytesIO(pdf_bytes)
                pdf_out.seek(0)
                return pdf_out

            # Load the PKCS12 / PFX certificate
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
