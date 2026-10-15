"""Idempotent source finalization with compilation checks; no test assertions removed."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'.github/scripts/build-support.py'
s=p.read_text(encoding='utf-8')
s=re.sub(r"(?<=[A-Za-z])'(?=[A-Za-z])",'’',s)
s=s.replace('Windows · Outlook · Linux · Wi-Fi · Software<br>Available by remote appointment. Price agreed before work begins.','From C$45 CAD · Extended support C$80 CAD<br>Windows · Outlook · Linux · Wi-Fi · Software<br>Available by appointment. Price agreed before work begins.')
compile(s,str(p),'exec')
p.write_text(s,encoding='utf-8')
for name in ['support-browser.py','support-live.py']:
 p=ROOT/'tests'/name
 s=p.read_text().replace("page.locator('[name=description]')", "page.locator('textarea[name=description]')")
 compile(s,str(p),'exec')
 p.write_text(s)
print('Editorial copy and explicit textarea selectors validated; all functional assertions retained.')
