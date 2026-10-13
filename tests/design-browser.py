"""Design release QA. Demo and form network calls are mocked; no customer emails are sent."""
import functools, json, os, threading, zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urljoin, urlsplit, unquote
from bs4 import BeautifulSoup
from PIL import Image
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results'/'design';OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start();BASE='http://127.0.0.1:'+str(server.server_port)
checks=[];errors=[]
def passed(name):checks.append(name);print('PASS:',name,flush=True)
def images_loaded(page):
 page.locator('img').evaluate_all('async imgs=>{await Promise.all(imgs.map(async el=>{el.loading="eager";await el.decode();}));}')
def no_overflow(page):return page.evaluate('document.documentElement.scrollWidth<=innerWidth')
# Check real static internal paths and anchors site-wide; do not assume a 200 means the intended section exists.
for file in ROOT.rglob('*.html'):
 if any(x in file.parts for x in ['test-results','node_modules','.git']):continue
 source=BeautifulSoup(file.read_text(),'html.parser');pageurl='https://jowkaritech.com/'+str(file.relative_to(ROOT)).replace('index.html','')
 for a in source.select('a[href]'):
  u=urlsplit(urljoin(pageurl,a['href']))
  if u.netloc!='jowkaritech.com' or u.scheme not in ['http','https']:continue
  path=ROOT/unquote(u.path).lstrip('/')
  if path.is_dir() or not path.suffix:path=path/'index.html'
  assert path.exists(),f'Broken local link: {file.name} -> {a["href"]}'
  if u.fragment and path.suffix=='.html':
   doc=BeautifulSoup(path.read_text(),'html.parser');assert doc.find(id=unquote(u.fragment)) or doc.find(attrs={'name':unquote(u.fragment)}),f'Broken section: {file.name} -> {a["href"]}'
passed('all static internal links and section anchors across the repository resolve')
with sync_playwright() as p:
 launch={'headless':True}
 if os.environ.get('CHROMIUM_PATH'):launch['executable_path']=os.environ['CHROMIUM_PATH']
 browser=p.chromium.launch(**launch);context=browser.new_context(viewport={'width':1280,'height':840},reduced_motion='reduce',accept_downloads=True)
 context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
 page=context.new_page();context.tracing.start(screenshots=True,snapshots=True,sources=True)
 try:
  # Exact demo screenshots, used on the homepage rather than made-up illustrations.
  for demo in ['roofing','plumbing','electrician']:
   page.goto(BASE+'/demo/'+demo+'/');images_loaded(page);page.screenshot(path=str(OUT/(demo+'-desktop.png')))
   Image.open(OUT/(demo+'-desktop.png')).convert('RGB').save(ROOT/'assets/site'/(demo+'-preview.webp'),'WEBP',quality=87,method=6)
   assert 'noindex' in page.locator('meta[name=robots]').get_attribute('content')
   assert page.locator('.demoNotice').is_visible();passed(demo+': real concept renders with all photos and noindex')
   outbound=[];page.on('request',lambda r:outbound.append(r.url) if r.method=='POST' else None)
   choice=page.locator('[data-service]').first;value=choice.get_attribute('data-service');choice.click()
   expect(page.locator(f'input[name=service][value="{value}"]')).to_be_checked()
   page.locator('[data-step]').nth(0).locator('[data-next]').click()
   page.locator('[data-step]').nth(1).locator('[data-next]').click()
   expect(page.locator('#demoCity')).to_be_visible();assert not page.locator('#demoCity').evaluate('(e)=>e.validity.valid');passed(demo+': service selector and required-field validation')
   page.locator('#demoCity').fill('North Vancouver');page.locator('#demoProject').fill('Synthetic QA project, not a real service request.')
   page.locator('[data-step]').nth(1).locator('[data-next]').click();page.locator('[data-step]').nth(2).locator('[data-back]').click()
   expect(page.locator('#demoCity')).to_have_value('North Vancouver');page.locator('[data-step]').nth(1).locator('[data-next]').click()
   page.locator('#demoName').fill('QA Example');page.locator('#demoEmail').fill('qa@example.com');page.locator('[data-step]').nth(2).locator('[type=submit]').click()
   expect(page.locator('[data-demo-result]')).to_be_visible();expect(page.locator('[data-summary]')).to_contain_text('No request has been sent')
   assert not outbound,outbound;passed(demo+': complete guided enquiry, back navigation and no outbound submission')
   page.locator('[data-reset]').click();expect(page.locator('[data-step]').nth(0)).to_be_visible();passed(demo+': reset demonstration')
   page.locator('#questions summary').first.click();expect(page.locator('#questions details').first).to_have_attribute('open','');passed(demo+': FAQ opens')
  page.goto(BASE+'/demo/electrician/');page.locator('[data-gallery-filter=living]').click();expect(page.locator('[data-gallery-item]:visible')).to_have_count(1)
  page.locator('[data-gallery-filter=all]').click();expect(page.locator('[data-gallery-item]:visible')).to_have_count(2);passed('electrical concept: gallery filters and resets')
  page.set_viewport_size({'width':1440,'height':1000});page.goto(BASE+'/');images_loaded(page)
  page.screenshot(path=str(OUT/'homepage-desktop.png'),full_page=True)
  page.screenshot(path=str(OUT/'homepage-first-screen.png'))
  for demo in ['plumbing','electrician','roofing']:
   page.locator('[data-demo-tab='+demo+']').click();expect(page.locator('#featuredLink')).to_have_attribute('href','/demo/'+demo+'/');page.locator('#featuredImage').evaluate('async e=>{await e.decode();}');passed('homepage: '+demo+' selection updates live demo target and image')
  page.locator('#bizName').fill('Jowkari QA Business');page.locator('#bizType').select_option('Electrician');page.locator('#bizServices').fill('Lighting, Panels')
  page.locator('#quickBuilder [type=submit]').click();expect(page.frame_locator('#siteFrame').locator('h1')).to_be_visible()
  expect(page.locator('#projectName')).to_have_text('Jowkari QA Business');passed('homepage to real Studio handoff retains business information')
  # Export must open on the first page even when a secondary page is selected.
  page.once('dialog',lambda d:d.accept('About QA'));page.locator('[data-action=add-page]').click();page.locator('#publish').click()
  with page.expect_download() as download:page.locator('#exportZIP').click()
  download.value.save_as(str(OUT/'studio-site.zip'))
  with zipfile.ZipFile(OUT/'studio-site.zip') as z:
   html=BeautifulSoup(z.read('index.html').decode(),'html.parser');visible=[m for m in html.select('main.page') if not m.has_attr('hidden')];assert len(visible)==1 and visible[0]['data-page']=='Home'
  passed('Studio export always starts at the home page')
  page.locator('[data-close=publishDialog]').click();page.locator('[data-page=Home]').click();frame=page.frame_locator('#siteFrame');frame.locator('h1').click()
  page.locator('#inspector [data-field=link]').fill('#missing-section');page.locator('#inspector [data-field=title]').click()
  expect(page.locator('#toast')).to_contain_text('existing #page');expect(page.locator('#inspector [data-field=link]')).to_have_value('');passed('Studio rejects non-existent internal button destinations')
  # AI failure is an explicit recoverable failure, not a fabricated success.
  context.route('https://jowkari-ai.jowkari-1mh.workers.dev/**',lambda route:route.fulfill(status=503,headers={'access-control-allow-origin':BASE,'access-control-allow-headers':'content-type'},json={'error':'temporarily_unavailable'}))
  page.locator('[data-tab=settings]').click();old=frame.locator('h1').inner_text();page.once('dialog',lambda d:d.accept());page.locator('[data-action=ai]').click()
  expect(page.locator('#toast')).to_contain_text('unavailable');expect(frame.locator('h1')).to_have_text(old);passed('Studio AI failure preserves the existing draft')
  # Enquiry provider: success, error/retry, duplicate clicks, and offline protection.
  requests=[]
  def success(route):
   headers={'access-control-allow-origin':BASE,'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type,accept'}
   if route.request.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
   requests.append(route.request.post_data_json);route.fulfill(status=200,headers=headers,json={'success':True})
  context.route('https://api.web3forms.com/submit',success)
  page.goto(BASE+'/');page.locator('#leadName').fill('QA Test');page.locator('#leadBusiness').fill('Test business');page.locator('#leadEmail').fill('qa@example.com');page.locator('#leadMessage').fill('Test only')
  page.locator('#contactForm [type=submit]').dblclick();expect(page.locator('.formStatus')).to_contain_text('accepted by our form provider');assert len(requests)==1;assert requests[0]['source_page']=='/';passed('live-form code handles acceptance and blocks duplicate sends (mocked provider)')
  context.unroute('https://api.web3forms.com/submit',success)
  context.route('https://api.web3forms.com/submit',lambda route:route.abort('failed'))
  page.reload();page.locator('#leadName').fill('Preserve me');page.locator('#leadBusiness').fill('Preserve business');page.locator('#leadEmail').fill('qa@example.com');page.locator('#leadMessage').fill('Preserve my message');page.locator('#contactForm [type=submit]').click()
  expect(page.locator('.formStatus')).to_contain_text('could not be confirmed');expect(page.locator('#leadMessage')).to_have_value('Preserve my message');expect(page.locator('#contactForm [type=submit]')).to_be_enabled();passed('form network failure preserves fields and permits retry')
  context.set_offline(True);page.locator('#contactForm [type=submit]').click();expect(page.locator('.formStatus')).to_contain_text('offline');context.set_offline(False);passed('offline forms give a recoverable message')
  # Every breakpoint must be navigable and free of horizontal overflow.
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900})
   for name,path in [('home','/'),('portfolio','/portfolio.html'),('roofing','/demo/roofing/'),('plumbing','/demo/plumbing/'),('electrician','/demo/electrician/')]:
    page.goto(BASE+path);assert no_overflow(page),f'{name}: horizontal overflow at {width}px'
    assert page.locator('h1').count()==1
    assert not page.locator('img:not([alt])').count()
    if width<=768:
     menu=page.locator('[data-menu]');menu.click();expect(menu).to_have_attribute('aria-expanded','true');page.keyboard.press('Escape');expect(menu).to_have_attribute('aria-expanded','false')
    if width in [390,1440]:
     images_loaded(page);page.screenshot(path=str(OUT/(name+('-mobile' if width==390 else '-full')+'.png')),full_page=True)
   passed(str(width)+'px: all five pages fit, have alt text, one H1 and working navigation')
  # Source links into Studio are real; the selected industry is retained.
  page.set_viewport_size({'width':1440,'height':1000});page.goto(BASE+'/portfolio.html')
  page.locator('.caseText .lineLink').first.click();expect(page.locator('#projectName')).to_have_text('NorthPeak Roofing');passed('portfolio industry link opens editable roofing project')
  assert not errors,errors;passed('no uncaught browser JavaScript errors across the tested flows')
  (OUT/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'scope':'Desktop/mobile browser tests; email provider and AI failures mocked.'},indent=2))
 except Exception:
  page.screenshot(path=str(OUT/'failure.png'),full_page=True);print('BROWSER ERRORS:',errors,flush=True);raise
 finally:
  context.tracing.stop(path=str(OUT/'trace.zip'));browser.close();server.shutdown()
