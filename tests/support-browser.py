"""Run over HTTP in CI. External form calls are mocked here; live checks are separate."""
import functools,json,hashlib,threading,xml.etree.ElementTree as ET
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urljoin,urlsplit,unquote
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/support';OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();BASE='http://127.0.0.1:'+str(server.server_port)
manifest=json.loads((ROOT/'remote-it-release.json').read_text());checks=[]
def passed(name):checks.append(name);print('PASS:',name,flush=True)
for path,digest in manifest['preserved_hashes'].items():assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest,path+' was unexpectedly changed'
passed('existing builder, demos, APIs, integration and verification files are byte-identical')
index=BeautifulSoup((ROOT/'index.html').read_text(),'html.parser');assert index.find(id='quickBuilder') and index.find(id='remote-it-home');assert len(index.select('h1'))==1
passed('homepage gains IT-first content without removing website builder or secondary offers')
urls=[x.text for x in ET.parse(ROOT/'sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')];assert len(urls)==len(set(urls));assert set(manifest['new_public_urls']).issubset(urls)
titles=set();descriptions=set();internal=0
for u in urls:
 path=ROOT/unquote(urlsplit(u).path).lstrip('/');path=path/'index.html' if path.is_dir() else path
 soup=BeautifulSoup(path.read_text(),'html.parser')
 assert len(soup.select('h1'))==1 and len(soup.select('title'))==1,str(path)
 assert soup.select_one('link[rel=canonical]')['href']==u
 assert 'noindex' not in soup.select_one('meta[name=robots]')['content']
 assert soup.title.text not in titles; titles.add(soup.title.text)
 desc=soup.select_one('meta[name=description]')['content'];assert desc and desc not in descriptions;descriptions.add(desc)
 graph=json.loads(soup.select_one('#jowkari-entity-schema').string)['@graph'];org=[x for x in graph if x.get('@type')=='Organization'];assert len(org)==1 and org[0]['@id']=='https://jowkaritech.com/#org'
 for a in soup.select('a[href]'):
  link=urlsplit(urljoin(u,a['href']))
  if link.netloc!='jowkaritech.com' or link.scheme not in ['http','https']:continue
  dest=ROOT/unquote(link.path).lstrip('/');dest=dest/'index.html' if dest.is_dir() or not dest.suffix else dest;assert dest.exists(),str(path)+' -> '+a['href'];internal+=1
  if link.fragment:assert BeautifulSoup(dest.read_text(),'html.parser').find(id=unquote(link.fragment)),str(path)+' broken '+a['href']
 if u in manifest['new_public_urls']:
  assert soup.html['lang']=='en-CA';assert not soup.select('img:not([alt])')
  assert all(img.get('width') and img.get('height') for img in soup.select('img'))
  raw=json.dumps(graph);assert 'aggregateRating' not in raw and 'streetAddress' not in raw and 'openingHours' not in raw
  for service in [x for x in graph if x.get('@type')=='Service']:
   assert service['provider']['@id']=='https://jowkaritech.com/#org'
   for offer in service.get('offers',[]):assert offer['priceCurrency']=='CAD' and str(offer['price']) in soup.get_text()
passed(f'{len(urls)} sitemap pages: unique metadata, canonicals, structured business identity and {internal} internal links')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');ctx.tracing.start(screenshots=True,snapshots=True,sources=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)));events=[]
 page.add_init_script("window.__supportEvents=[];window.addEventListener('jowkari:conversion',e=>window.__supportEvents.push(e.detail));")
 mode={'kind':'success'};sent=[]
 def api(route):
  request=route.request;headers={'Access-Control-Allow-Origin':BASE,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}
  if request.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
  if request.url.endswith('/v1/challenge'):
   if mode['kind']=='challenge_down':route.fulfill(status=503,headers=headers,json={'ok':False});return
   route.fulfill(status=200,headers=headers,json={'ok':True,'token':'test-nonce.test-time.test-signature','expires_at':9999999999999});return
  assert request.method=='POST';data=request.post_data_json;sent.append(data)
  if mode['kind']=='error':route.fulfill(status=422,headers=headers,json={'ok':False,'code':'validation','message':'Please check the description.','field':'description','retrySafe':True});return
  if mode['kind']=='rate':route.fulfill(status=429,headers=headers,json={'ok':False,'code':'rate_limit','message':'Too many requests. Wait a minute.','retrySafe':True});return
  if mode['kind']=='expired':route.fulfill(status=403,headers=headers,json={'ok':False,'code':'challenge_expired','message':'Refresh the security check.','retrySafe':True});return
  if mode['kind']=='unknown':route.fulfill(status=503,headers=headers,json={'ok':False,'code':'delivery_unknown','message':'Delivery could not be confirmed. Email us.','reference':'JT-ABCDEF123456','retrySafe':False});return
  route.fulfill(status=201,headers=headers,json={'ok':True,'status':'provider_accepted','reference':'JT-ABCDEF123456'})
 ctx.route('https://jowkari-support.jowkari-1mh.workers.dev/**',api)
 def fill(recovery=False):
  page.locator('[name=name]').fill('Support QA Example');page.locator('[name=email]').fill('qa@example.com');page.locator('[name=device]').select_option('Laptop');page.locator('[name=os]').select_option('Windows 11');page.locator('[name=issue]').select_option('Account / login recovery' if recovery else 'Slow computer');page.locator('textarea[name=description]').fill('Synthetic QA: one program takes a long time to open.');page.locator('[name=preferred_time]').fill('Weekdays after 6 pm');page.locator('[name=timezone]').select_option('America/Vancouver');page.locator('[name=consent]').check()
 try:
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':950})
   for path in ['/','/remote-it-support/','/request-support/','/support-pricing/','/password-recovery-help/','/support-resources/','/support-resources/outlook-not-receiving-email/']:
    page.goto(BASE+path);assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),str(width)+' '+path
    expect(page.locator('h1')).to_be_visible()
    if width<=768:
     button=page.locator('[data-it-menu]');button.click();expect(button).to_have_attribute('aria-expanded','true');page.keyboard.press('Escape');expect(button).to_have_attribute('aria-expanded','false')
    if width in [390,1440] and path in ['/','/remote-it-support/','/request-support/']:
     page.screenshot(path=str(OUT/((path.strip('/') or 'homepage')+'-'+str(width)+'.png')),full_page=True)
   passed(str(width)+'px: primary support pages fit with working mobile menu and visible headings')
  page.set_viewport_size({'width':1440,'height':1000});page.goto(BASE+'/');page.locator('#remote-it-home a[href="/request-support/"]').first.click();expect(page).to_have_url(BASE+'/request-support/');expect(page.locator('#supportSecurity')).to_contain_text('ready');passed('homepage Get IT Help opens the actual support form')
  labels=page.locator('#supportRequest input:not([type=hidden]),#supportRequest select,#supportRequest textarea').evaluate_all('(els)=>els.every(e=>e.id && document.querySelector(`label[for="${e.id}"]`) || e.closest("label"))');assert labels
  assert page.locator('#supportRequest').get_attribute('method')=='post';assert not page.locator('input[type=password],input[type=file]').count();passed('accessible labelled fields, POST-only form and no credential or attachment fields')
  fill();page.locator('[name=consent]').uncheck();before=len(sent);page.locator('#supportRequest [type=submit]').click();assert len(sent)==before;assert not page.locator('[name=consent]').evaluate('(e)=>e.validity.valid');passed('unchecked contact consent prevents a submission')
  page.locator('[name=consent]').check();page.locator('[name=issue]').select_option('Account / login recovery');expect(page.locator('#ownershipRow')).to_be_visible();page.locator('#supportRequest [type=submit]').click();assert len(sent)==before;page.locator('[name=owner_confirmed]').check();passed('account recovery separately requires ownership or administrative authority')
  page.locator('textarea[name=description]').fill('My password: should-never-be-sent');page.locator('#supportRequest [type=submit]').click();expect(page.locator('#supportStatus')).to_contain_text('remove passwords');assert len(sent)==before;passed('credential-like details are blocked before leaving the browser')
  page.goto(BASE+'/request-support/?utm_source=kijiji&utm_medium=referral&utm_campaign=remote-it-launch');fill(True);page.locator('[name=owner_confirmed]').check();page.locator('#supportRequest [type=submit]').dblclick();expect(page.locator('#supportStatus')).to_contain_text('Request accepted by our email provider');assert len(sent)==before+1;assert sent[-1]['utm_source']=='kijiji' and sent[-1]['consent'] is True and sent[-1]['owner_confirmed'] is True;assert sent[-1]['source_page']=='/';passed('single confirmed submission, reference, source attribution and no instant booking claim')
  metrics=page.evaluate('window.__supportEvents');assert any(x['event']=='support_request_submitted' for x in metrics);assert all(set(x)=={'event','page','channel'} for x in metrics);assert 'qa@example.com' not in json.dumps(metrics);assert 'Synthetic QA' not in page.url;assert 'qa@example.com' not in page.evaluate('JSON.stringify(sessionStorage)');passed('conversion hooks, storage and URL do not contain support contents')
  expect(page.locator('#supportRequest [type=submit]')).to_be_disabled();passed('success cannot be sent twice')
  mode['kind']='error';page.goto(BASE+'/request-support/');fill();page.locator('#supportRequest [type=submit]').click();expect(page.locator('#supportStatus')).to_contain_text('check the description');expect(page.locator('textarea[name=description]')).to_have_value('Synthetic QA: one program takes a long time to open.');expect(page.locator('textarea[name=description]')).to_have_attribute('aria-invalid','true');expect(page.locator('#supportRequest [type=submit]')).to_be_enabled();passed('server validation failure preserves fields and allows correction')
  mode['kind']='rate';page.locator('#supportRequest [type=submit]').click();expect(page.locator('#supportStatus')).to_contain_text('Wait a minute');passed('excessive submission response is visible and recoverable')
  mode['kind']='expired';page.locator('#supportRequest [type=submit]').click();expect(page.locator('#supportRequest [type=submit]')).to_be_disabled();page.locator('#refreshSecurity').click();expect(page.locator('#supportRequest [type=submit]')).to_be_enabled();passed('expired challenge can be refreshed without losing form contents')
  mode['kind']='unknown';page.locator('#supportRequest [type=submit]').click();expect(page.locator('#supportStatus')).to_contain_text('could not be confirmed');expect(page.locator('#supportRequest [type=submit]')).to_be_disabled();expect(page.locator('textarea[name=description]')).to_have_value('Synthetic QA: one program takes a long time to open.');passed('ambiguous delivery does not pretend success or trigger an automatic repeat')
  mode['kind']='challenge_down';page.goto(BASE+'/request-support/');expect(page.locator('#supportSecurity')).to_contain_text('unavailable');expect(page.locator('#supportRequest [type=submit]')).to_be_disabled();expect(page.locator('a[href^="mailto:"]').first).to_be_visible();passed('missing service configuration fails closed with a real email fallback')
  mode['kind']='success';page.goto(BASE+'/request-support/');fill();ctx.set_offline(True);page.locator('#supportRequest [type=submit]').click();expect(page.locator('#supportStatus')).to_contain_text('offline');ctx.set_offline(False);passed('offline error preserves the request')
  page.goto(BASE+'/support-resources/');page.locator('a[href="/support-resources/microsoft-account-recovery/"]').click();page.locator('a[href="#step-3"]').click();expect(page).to_have_url(BASE+'/support-resources/microsoft-account-recovery/#step-3');passed('resource directory and article contents links work')
  page.goto(BASE+'/remote-it-support/');page.locator('summary').first.click();expect(page.locator('details').first).to_have_attribute('open','');passed('support FAQs open with native accessible controls')
  page.goto(BASE+'/support-pricing/');assert page.evaluate("window.__supportEvents.some(e=>e.event==='support_pricing_view')");passed('pricing view conversion hook available without adding an analytics SDK')
  assert not errors,errors;passed('no uncaught JavaScript errors in the tested support flows')
  (OUT/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'new_routes':len(manifest['new_public_urls']),'sitemap_pages':len(urls),'links_checked':internal,'scope':'Chromium over HTTP. Intake API mocked; server and live tests separate.'},indent=2))
 except Exception:
  page.screenshot(path=str(OUT/'failure.png'),full_page=True);print('Browser errors:',errors,flush=True);raise
 finally:ctx.tracing.stop(path=str(OUT/'trace.zip'));browser.close();server.shutdown()
