"""Small, idempotent release corrections. Refuse unexpected source rather than guessing."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def patch(path,old,new):
 p=ROOT/path;text=p.read_text()
 if new in text:return
 if old not in text:raise SystemExit('Patch anchor not found: '+path+' / '+old[:65])
 p.write_text(text.replace(old,new,1))
patch('jowkari-sites/studio.mjs','function exportSite(){try{const p=normalize(project);','function exportSite(){try{const p=normalize(project);p.page=Object.keys(p.pages)[0];')
patch('jowkari-sites/studio.mjs',"project=incoming;selected='';history=[];future=[];queueSave();", "project=incoming;selected='';history=[];future=[];shareRecord=null;$('shareResult').hidden=true;try{localStorage.removeItem('jowkariStudioShare');}catch{}queueSave();")
patch('jowkari-sites/studio.mjs',"if(key==='link'&&value&&!safeLink(value)){toast('Use https://, tel:, mailto:, #contact or a #page-0 style internal link.');return;}","if(key==='link'&&value&&(!safeLink(value)||(value.startsWith('#')&&value!=='#contact'&&!Object.keys(project.pages).some((_,i)=>value==='#page-'+i)))){toast('Choose #contact, an existing #page-0 / #page-1 destination, or a valid https://, tel: or mailto: link.');el.value=s.link;return;}")
patch('jowkari-sites/core.mjs',"  const pairs = Object.entries(input.pages).filter(([k, v]) => !['__proto__', 'constructor', 'prototype'].includes(k) && Array.isArray(v)).slice(0, 12);", "  const pairs = Object.entries(input.pages).filter(([k, v]) => !['__proto__', 'constructor', 'prototype'].includes(k) && Array.isArray(v));\n  if(pairs.length>12)throw new Error('This editor supports up to 12 pages. No pages were removed; export a backup before simplifying the project.');\n  if(pairs.some(([,v])=>v.length>50))throw new Error('A page can contain up to 50 sections. No sections were removed.');")
patch('jowkari-sites/studio.mjs',"window.history.replaceState({},'',location.pathname);queueSave();}","const example=({roofing:{style:'natural',photo:'coastal-home'},plumbing:{style:'blue',photo:'bathroom'},electrician:{style:'clean',photo:'kitchen'}})[q.get('demo')];if(example){project.style=example.style;project.pages.Home[0].image='https://jowkaritech.com/assets/site/'+example.photo+'.webp';project.pages.Home[0].alt='Stock design inspiration — replace with your own project photo';}window.history.replaceState({},'',location.pathname);queueSave();}")
patch('jowkari-sites/studio.mjs',"if(shareRecord?.expires_at>Date.now())showShare(shareRecord);$('publishDialog').showModal();", "if(shareRecord?.expires_at>Date.now())showShare(shareRecord);else $('shareResult').hidden=true;$('publishDialog').showModal();")
p=ROOT/'local-seo.css';text=p.read_text();fix='\n/* Table readability and reduced-motion support */\n.compare{color:#18262d}a:focus-visible,button:focus-visible{outline:3px solid #c74112;outline-offset:4px}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}\n'
if '/* Table readability and reduced-motion support */' not in text:p.write_text(text+fix)
# Keep entry points from all existing SEO/service pages working.
patch('index.html','<section id="work" class="section">','<section id="work" class="section"><span id="demo"></span>')
patch('index.html','<span id="product"></span>','<span id="product"></span><span id="features"></span>')
p=ROOT/'assets/site/design.css';text=p.read_text();fix='\n/* Final framing: do not crop words from an actual website screenshot. */\n.workPreview img{aspect-ratio:1280/840;object-fit:contain;object-position:top left}.demoHeader{position:sticky;top:0;z-index:70}.roundBadge b{font-size:23px}\n'
if '/* Final framing:' not in text:p.write_text(text+fix)
print('Studio, layout and legacy-link corrections applied. Drafts and Worker routes preserved.')
