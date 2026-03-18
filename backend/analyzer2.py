import xml.etree.ElementTree as ET
import csv
import io


def parse_fluke_csv(csv_content: str):
    """
    Fluke / általános CSV mérési export feldolgozása.
    Várható oszlopnevek (kis/nagybetűtől független): Location/Circuit/Point, Rpe/Zs/Riso/RCD, stb.
    Egy sor = egy mérés. Visszatérési formátum megegyezik a PADFX-szal (type, location, params, results).
    """
    measurements = []
    try:
        reader = csv.DictReader(io.StringIO(csv_content.strip()), delimiter=";")
        if not reader.fieldnames:
            reader = csv.DictReader(io.StringIO(csv_content.strip()), delimiter=",")
        fieldnames = [f.strip().lower() if f else "" for f in (reader.fieldnames or [])]
        rows = list(reader)
    except Exception:
        return measurements

    def get(row, *keys):
        for k in keys:
            for col in row:
                if col and k.lower() in (col or "").lower():
                    v = row.get(col)
                    if v not in (None, ""):
                        return v
        return ""

    for row in rows:
        row_lower = {k.strip().lower(): v for k, v in row.items() if k}
        loc = (
            get(row, "location", "circuit", "point", "hely", "áramkör")
            or row_lower.get("location") or row_lower.get("circuit") or row_lower.get("point") or "—"
        )
        loc = (loc or "").strip() or "—"

        # Rpe (Ω)
        rpe_val = get(row, "rpe", "continuity", "folytonosság") or row_lower.get("rpe") or row_lower.get("continuity")
        if rpe_val not in (None, ""):
            try:
                float(str(rpe_val).replace(",", "."))
            except ValueError:
                pass
            else:
                measurements.append({
                    "type": "Rpe Folytonosság",
                    "location": loc,
                    "params": {},
                    "results": {"r_43": str(rpe_val).replace(",", "."), "r_46": str(rpe_val).replace(",", ".")},
                })

        # Zs (Ω) + Device
        zs_val = get(row, "zs", "loop", "zloop", "hurok") or row_lower.get("zs") or row_lower.get("loop")
        device = get(row, "device", "mcb", "biztosító") or row_lower.get("device") or row_lower.get("mcb") or "B16"
        if zs_val not in (None, ""):
            try:
                float(str(zs_val).replace(",", "."))
            except ValueError:
                pass
            else:
                measurements.append({
                    "type": "Zs Hurokellenállás",
                    "location": loc,
                    "params": {"p_108": device[0] if device else "B", "p_28": "".join(c for c in str(device) if c.isdigit() or c == ".") or "16"},
                    "results": {"r_38": str(zs_val).replace(",", "."), "r_205": str(zs_val).replace(",", ".")},
                })

        # RCD: Idn (mA), t (ms)
        idn_val = get(row, "idn", "iδn", "rcd", "fi") or row_lower.get("idn") or row_lower.get("rcd")
        t_val = get(row, "t", "time", "ms", "kioldás") or row_lower.get("t") or row_lower.get("ms")
        if idn_val not in (None, "") or t_val not in (None, ""):
            idn_num = 30
            try:
                idn_num = int(float(str(idn_val or "30").replace(",", ".")))
            except ValueError:
                pass
            measurements.append({
                "type": "RCD (FI-relé)",
                "location": loc,
                "params": {"p_28": str(idn_num)},
                "results": {"r_28": str(t_val).replace(",", ".") if t_val else ""},
            })

        # Riso (MΩ): L-N, L-PE, N-PE
        ln_val = get(row, "l-n", "ln", "riso", "insulation") or row_lower.get("l-n") or row_lower.get("ln")
        lpe_val = get(row, "l-pe", "lpe") or row_lower.get("l-pe") or row_lower.get("lpe")
        npe_val = get(row, "n-pe", "npe") or row_lower.get("n-pe") or row_lower.get("npe")
        if ln_val not in (None, "") or lpe_val not in (None, "") or npe_val not in (None, ""):
            measurements.append({
                "type": "Riso Szigetelés",
                "location": loc,
                "params": {},
                "results": {
                    "r_11": str(ln_val).replace(",", ".") if ln_val else "",
                    "r_14": str(lpe_val).replace(",", ".") if lpe_val else "",
                    "r_15": str(npe_val).replace(",", ".") if npe_val else "",
                },
            })
    return measurements


def parse_padfx_xml(xml_content: str):
    """Parses PADFX XML content and returns a list of measurements."""
    try:
        root = ET.fromstring(xml_content)
        
        measurements = []
        for so in root.findall('.//SO'):
            node_name_elem = so.find('N')
            node_name = node_name_elem.text if node_name_elem is not None else "Unknown"
            
            for m in so.findall('.//M'):
                mid_elem = m.find('.//MID')
                mid = mid_elem.text if mid_elem is not None else "Unknown"
                
                m_date = ""
                m_params = {}
                for mp in m.findall('.//MP'):
                    val_elem = mp.find('V')
                    val = val_elem.text if val_elem is not None else ""
                    mp_id = mp.attrib.get('Id', '')
                    if mp_id == '1':
                        m_date = val
                    else:
                        m_params[f"p_{mp_id}"] = val
                        
                m_results = {}
                for rs in m.findall('.//R'):
                    val_elem = rs.find('V')
                    val = val_elem.text if val_elem is not None else ""
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
        return measurements
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []
