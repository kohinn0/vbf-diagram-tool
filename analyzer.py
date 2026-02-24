import xml.etree.ElementTree as ET
import sys

def analyze_padfx_xml(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    m_types = {}
    
    for m in root.findall('.//M'):
        m_name_elem = m.find('.//MP[@Id="260"]/V')
        name = m_name_elem.text if m_name_elem is not None else "Unknown"
        
        if name not in m_types:
            m_types[name] = []
            
        params = [mp.find('V').text if mp.find('V') is not None else '' for mp in m.findall('.//MP')]
        results = [(rs.attrib.get('Id'), rs.find('V').text if rs.find('V') is not None else '') for rs in m.findall('.//R')]
        
        m_types[name].append({'params': params, 'results': results})
        
    for k, v in m_types.items():
        print(f"Type: {k}, Count: {len(v)}")
        print(f"Sample: {v[0]}")
        print("-" * 40)

if __name__ == '__main__':
    analyze_padfx_xml('padfx_extracted/DataSource.padf')
