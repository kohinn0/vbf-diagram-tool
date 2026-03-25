import os, glob, re

ui_dir = 'c:/Users/gep/vbf/vbf-diagram-tool/frontend/js/ui'
files = glob.glob(os.path.join(ui_dir, '*.js'))

def replace_alert(match):
    prefix = match.group(1)
    full_alert = match.group(2)
    inner_quote = match.group(3)
    msg = match.group(4)
    
    if 'showToast' in prefix:
        return match.group(0)
        
    lower_msg = msg.lower()
    if any(w in lower_msg for w in ['hiba', 'sikertelen', 'nem ', 'érvénytelen', 'kötelező', 'tilos']):
        toast_type = 'error'
    elif any(w in lower_msg for w in ['sikeres', 'mentve', 'létrehozva', 'kész', 'jóváhagyva', 'törölve', 'elküldve', 'feltöltve']):
        toast_type = 'success'
    else:
        toast_type = 'info'
        
    return f"{prefix}if (window.showToast) window.showToast({inner_quote}{msg}{inner_quote}, '{toast_type}'); else {full_alert}"

pattern = re.compile(r'(.*?)(alert\(([\'\"])(.*?)\3\))')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        
    lines = content.split('\n')
    new_lines = []
    replaced = False
    for line in lines:
        if 'alert(' in line and 'showToast' not in line:
            new_line = pattern.sub(replace_alert, line)
            new_lines.append(new_line)
            if new_line != line: replaced = True
        else:
            new_lines.append(line)
            
    if replaced:
        with open(f, 'w', encoding='utf-8') as file:
            file.write('\n'.join(new_lines))
        print(f'Replaced alerts in {os.path.basename(f)}')
