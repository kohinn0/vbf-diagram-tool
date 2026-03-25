import os
import re

base_dir = r"c:\Users\gep\vbf\vbf-diagram-tool\frontend\js\ui"
files_to_check = ["measurements.js", "padfx.js", "reports.js", "sitetree.js", "masterdata.js"]

def update_inputs(content):
    # Change type="number" to type="text" inputmode="decimal" for meas-val, meas-ln, meas-lpe, meas-npe, meas-zs
    # Also for idn, t1, t5, ramp, uc
    classes = r"meas-(val|ln|lpe|npe|zs|idn|t1|t5|ramp|uc|point)"
    # We find: type="number" ... class="meas-val" (in any order)
    # The safest way is to find <input ... class="meas-..." ...> and replace type="number" in it.
    
    def replacer(match):
        tag = match.group(0)
        tag = re.sub(r'type="number"', 'type="text" inputmode="decimal"', tag)
        return tag
        
    return re.sub(r'<input\s+[^>]*?class=["\'].*?' + classes + r'.*?["\'][^>]*?>', replacer, content)

for fname in files_to_check:
    fpath = os.path.join(base_dir, fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
        
    new_content = update_inputs(content)
    
    if new_content != content:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {fpath}")

print("Done input type replacement.")
