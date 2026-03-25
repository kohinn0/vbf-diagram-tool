import os
import re

def remove_mee_from_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements list
    replacements = [
        # app.html
        (r' \(MEEVET[^)]*\)', ''),
        (r'MEEVET', ''),
        (r'MEE Minősítés', 'Minősítés'),
        (r'MEE szerinti', 'Minősítés szerinti'),

        # defects.js (standards)
        (r'; MEE Kézikönyv M[0-9]+', ''),
        (r'; MEE Kézikönyv M[0-9]+-M[0-9]+', ''),

        # reports.js
        (r'autoDetectMEEQualification', 'autoDetectQualification'),
        (r'meeQualification:', 'autoQualification:'),
        (r'MEE "\(A\)" - ', ''),
        (r'MEE "\(B\)" - ', ''),
        (r'MEE "\(C\)" - ', ''),
        (r'MEE "\(D\)" - ', ''),
        (r'MEE Handbook Categories:', 'Minősítési kategóriák:'),
        (r'MEE Handbook qualifying document variant', ' qualifying document variant'),

        # generator.py / generator_pdf.py
        (r' \(MEE Handbook\)', ''),
        (r', c_data\.get\(\'meeQualification\', \'N/A\'\)', ', c_data.get(\'autoQualification\', \'N/A\')'),
        (r'MEE Handbook Minősítő Irat Változat kezelése', 'Minősítő Irat Változat kezelése'),
        (r'MEE Handbook változat', 'Minősítő Irat változat'),
        (r'mee_descriptions', 'qual_descriptions'),
        (r'MEE Kézikönyv szerinti', 'Szabvány szerinti'),
        (r'MEE severity legend', 'Severity legend'),
        (r'Hibakategóriák a MEE Kézikönyv szerint', 'Hibakategóriák jelentősége'),
        (r'MEE severity keyword detection', 'Severity keyword detection'),
        (r'Determine MEE severity', 'Determine severity'),
        (r'class TestMEEClassification', 'class TestDefectClassification'),
        (r'MEE Kézikönyv hibakategorizálás', 'Hibakategorizálás'),
        (r'frontend autoDetectMEE', 'frontend autoDetectQualification'),
        
        # In generator PDF specifically:
        (r'\(MEE Handbook\)', ''),
    ]

    new_content = content
    for old, new in replacements:
        new_content = re.sub(old, new, new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

files_to_update = [
    'frontend/app.html',
    'frontend/js/ui/reports.js',
    'frontend/js/ui/defects.js',
    'frontend/js/ui/dashboard.js',
    'backend/generator.py',
    'backend/generator_pdf.py',
    'backend/routers/dashboard.py',
    'backend/tests/test_validation.py',
]

for f in files_to_update:
    remove_mee_from_file(os.path.join('c:\\Users\\gep\\vbf\\vbf-diagram-tool', f))
