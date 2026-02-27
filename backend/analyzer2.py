import xml.etree.ElementTree as ET

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
