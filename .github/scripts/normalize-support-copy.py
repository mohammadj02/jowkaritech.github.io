"""Normalize typographic apostrophes between letters in editorial copy, then syntax-check."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'.github/scripts/build-support.py'
s=p.read_text(encoding='utf-8')
s=re.sub(r"(?<=[A-Za-z])'(?=[A-Za-z])",'’',s)
compile(s,str(p),'exec')
p.write_text(s,encoding='utf-8')
print('Support editorial copy normalized; Python syntax validated.')
