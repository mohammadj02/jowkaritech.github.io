"""Synthetic files only. No store access, payments, customer data or emails."""
import argparse,csv,functools,io,json,threading,zipfile,xml.sax.saxutils as xml
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
arg=argparse.ArgumentParser();arg.add_argument('--live');args=arg.parse_args();server=None
CSP="default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',CSP);self.send_header('X-Content-Type-Options','nosniff');super().end_headers()
if args.live:BASE=args.live.rstrip('/')
else:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'public')));threading.Thread(target=server.serve_forever,daemon=True).start();BASE='http://127.0.0.1:'+str(server.server_port)
checks=[]
def passed(s):checks.append(s);print('PASS:',s,flush=True)
HEADERS=['Item','Product name','Retail price','Family','Size','Colour','Brand']
ROWS=[['000421','Coast cotton tee','29.00','TEE-01','Small','Navy','Example Supply'],['000422','Coast cotton tee','29.00','TEE-01','Medium','Navy','Example Supply']]
def workbook(path,bad=False):
 # Minimal independent OOXML fixture: exact known literal values; no spreadsheet library involved.
 rows=[]
 for r,values in enumerate([HEADERS,*ROWS],1):
  cells=[]
  for c,value in enumerate(values):
   ref=chr(65+c)+str(r)
   if bad and r==2 and c==0:cells.append(f'<c r="{ref}"><v>421</v></c>')
   elif bad and r==3 and c==2:cells.append(f'<c r="{ref}"><f>10+19</f><v>29</v></c>')
   else:cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{xml.escape(value)}</t></is></c>')
  rows.append(f'<row r="{r}">'+''.join(cells)+'</row>')
 with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
  z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
  z.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Supplier" sheetId="1" r:id="rId1"/></sheets></workbook>')
  z.writestr('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
  z.writestr('xl/worksheets/sheet1.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:G3"/><sheetData>'+''.join(rows)+'</sheetData></worksheet>')
workbook(OUT/'safe.xlsx');workbook(OUT/'unsafe.xlsx',True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True,reduced_motion='reduce');page=ctx.new_page();errors=[];outbound=[];writes=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 def observe(req):
  if req.method not in ['GET','HEAD']:writes.append(req.url)
  if req.url.startswith('http') and not req.url.startswith(BASE+'/'):outbound.append(req.url)
 page.on('request',observe)
 try:
  r=page.goto(BASE+'/');assert r.status==200;expect(page.locator('h1')).to_contain_text('messy spreadsheet');passed('app loads with content-security policy and no account required')
  page.screenshot(path=str(OUT/'landing-desktop.png'),full_page=True)
  page.locator('#sample').click();expect(page.locator('#workspace')).to_be_visible();expect(page.locator('#fileSummary')).to_contain_text('4 rows');assert page.locator('[data-row="0"][data-col="0"]').input_value()=='000421';passed('sample is parsed and leading-zero identifiers stay text')
  page.locator('#validate').click();expect(page.locator('#status')).to_contain_text('Confirm');expect(page.locator('#review')).to_be_hidden();passed('mapping confirmation is required')
  page.locator('#mapConfirm').check();page.locator('#validate').click();expect(page.locator('#blockers')).to_have_text('0');expect(page.locator('#products')).to_have_text('2');expect(page.locator('#exportAll')).to_be_disabled();passed('two groups, four variants validate; export still needs safety confirmation')
  page.locator('#ack').check()
  with page.expect_download() as dl:page.locator('#exportAll').click()
  dl.value.save_as(str(OUT/'actual-export.csv'));rows=list(csv.DictReader(io.StringIO((OUT/'actual-export.csv').read_text())))
  assert len(rows)==4 and all(x['Status']=='draft' and x['Published on online store']=='false' for x in rows);assert any(x['SKU']=='000421' for x in rows);passed('real CSV download contains exact SKUs and only new-draft settings')
  page.locator('#saveMap').click();saved=page.evaluate('localStorage.getItem("jowkari.catalog.mapping.v1")');assert '000421' not in saved and 'rows' not in saved;passed('saved mapping contains settings but no product values')
  first=page.locator('[data-row="1"][data-col="0"]');first.fill('000421');first.press('Tab');expect(page.locator('#review')).to_be_hidden();page.locator('#validate').click();expect(page.locator('#issues')).to_contain_text('Duplicate SKU');expect(page.locator('#exportAll')).to_be_disabled();passed('working-copy changes invalidate old output; duplicate SKU blocks export')
  with page.expect_download() as dl:page.locator('#report').click()
  dl.value.save_as(str(OUT/'report.json'));report=json.loads((OUT/'report.json').read_text());assert report['issues'] and report['manualEdits'];passed('downloadable review report includes blockers and manual edits')
  first=page.locator('[data-row="1"][data-col="0"]');first.fill('000422');first.press('Tab');page.locator('#validate').click();expect(page.locator('#blockers')).to_have_text('0');passed('correcting the working copy clears the blocker')
  page.locator('#map-group').select_option('-1');page.locator('#mapConfirm').check();page.locator('#validate').click();expect(page.locator('#issues')).to_contain_text('explicit product-group');passed('variants cannot be grouped by guesswork')
  page.locator('#loadMap').click();expect(page.locator('#map-group')).to_have_value('3');expect(page.locator('#mapConfirm')).not_to_be_checked();passed('saved mapping can be restored and requires fresh confirmation')
  page.locator('#file').set_input_files(str(OUT/'safe.xlsx'));expect(page.locator('#fileSummary')).to_contain_text('safe.xlsx');expect(page.locator('#fileSummary')).to_contain_text('2 rows');page.locator('#mapConfirm').check();page.locator('#validate').click();expect(page.locator('#blockers')).to_have_text('0');assert page.locator('#outputBody').inner_text().find('000421')>=0;passed('real XLSX reading via same-origin parser preserves literal identifiers')
  page.locator('#file').set_input_files(str(OUT/'unsafe.xlsx'));expect(page.locator('#fileSummary')).to_contain_text('unsafe.xlsx');page.locator('#mapConfirm').check();page.locator('#validate').click();expect(page.locator('#issues')).to_contain_text('stored as a number');expect(page.locator('#issues')).to_contain_text('Formula cells');expect(page.locator('#exportAll')).to_be_disabled();passed('numeric Excel identifiers and formula prices block output')
  page.locator('#file').set_input_files({'name':'bad.csv','mimeType':'text/csv','buffer':b'Title,SKU,Price\nMug,001,2,extra'});expect(page.locator('#status')).to_contain_text('columns');expect(page.locator('#workspace')).to_be_hidden();passed('malformed new file cannot leave old results exportable')
  page.locator('#file').set_input_files({'name':'file.pdf','mimeType':'application/pdf','buffer':b'%PDF-test'});expect(page.locator('#status')).to_contain_text('not supported');passed('unsupported formats produce a useful error')
  page.locator('#file').set_input_files({'name':'large.csv','mimeType':'text/csv','buffer':b'x'*(2*1024*1024+1)});expect(page.locator('#status')).to_contain_text('smaller than 2 MB');passed('file size limit enforced before parsing')
  page.locator('#sample').click();expect(page.locator('#workspace')).to_be_visible();page.locator('#forgetMap').click();assert page.evaluate('localStorage.getItem("jowkari.catalog.mapping.v1")') is None;page.locator('#clear').click();expect(page.locator('#workspace')).to_be_hidden();expect(page.locator('#review')).to_be_hidden();passed('clear file and forget mapping remove the app state independently')
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':950});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)
   page.locator('#sample').click();expect(page.locator('#workspace')).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)
   page.locator('#mapConfirm').check();page.locator('#validate').click();expect(page.locator('#blockers')).to_have_text('0');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(width)
   if width in [390,1440]:page.screenshot(path=str(OUT/('workspace-'+str(width)+'.png')),full_page=True)
   page.locator('#clear').click();passed(str(width)+'px: source controls, validation and review fit without horizontal page overflow')
  assert not errors,errors;assert not outbound,outbound;assert not writes,writes;passed('no uncaught errors, outbound third-party requests or file-upload/submission requests')
  (OUT/('live.json' if args.live else 'results.json')).write_text(json.dumps({'passed':len(checks),'checks':checks,'live':bool(args.live),'real_shopify_import':False,'files':'Synthetic fixtures only','no_payments_or_uploads':True},indent=2))
 except Exception:
  page.screenshot(path=str(OUT/'failure.png'),full_page=True);print('ERRORS:',errors,flush=True);raise
 finally:
  browser.close()
  if server:server.shutdown()
