import xml.etree.ElementTree as ET

def analyze_padfx_xml(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    m_types = {}
    
    for m in root.findall('.//M'):
        mid_elem = m.find('.//MID')
        mid = mid_elem.text if mid_elem is not None else "Unknown"
        
        if mid not in m_types:
            m_types[mid] = []
            
        params = [mp.find('V').text if mp.find('V') is not None else '' for mp in m.findall('.//MP')]
        results = [(rs.attrib.get('Id'), rs.find('V').text if rs.find('V') is not None else '') for rs in m.findall('.//R')]
        
        m_types[mid].append({'params': params, 'results': results})
        
    for k, v in m_types.items():
        print(f"MID: {k}, Count: {len(v)}")
        print(f"Sample: {v[0]}")
        print("-" * 40)

if __name__ == '__main__':
    analyze_padfx_xml('padfx_extracted/DataSource.padf')
