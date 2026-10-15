"""Focused laptop page QA: real browser over HTTP; no outbound customer messages."""
import argparse,functools,json,threading,time,urllib.request,urllib.error
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlsplit,parse_qs
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/laptop-search';OUT.mkdir(parents=True,exist_ok=True)
URLPATH='/computer-help-north-vancouver/';TITLE='Laptop & Computer Help North Vancouver | JowkariTech'
checks=[]
def passed(name):checks.append(name);print('PASS:',name,flush=True)
parser=argparse.ArgumentParser();parser.add_argument('--live',action='store_true');args=parser.parse_args()
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=None
if args.live:
 BASE='https://jowkaritech.com'
 for attempt in range(40):
  try:
   req=urllib.request.Request(BASE+URLPATH+'?release=laptop-20261015',headers={'Cache-Control':'no-cache','User-Agent':'JowkariTech-Laptop-Release/1.0'})
   with urllib.request.urlopen(req,timeout=20) as response:html=response.read().decode()
   if BeautifulSoup(html,'html.parser').title.get_text()==TITLE:break
  except (urllib.error.URLError,ValueError):pass
  time.sleep(4)
 else:raise AssertionError('The laptop page update is not live yet.')
else:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start();BASE='http://127.0.0.1:'+str(server.server_port)
 html=(ROOT/'computer-help-north-vancouver/index.html').read_text()
s=BeautifulSoup(html,'html.parser');assert s.title.get_text()==TITLE;assert len(s.select('h1'))==1
assert 'Laptop & computer help' in s.h1.get_text();assert 'North Vancouver' in s.h1.get_text()
assert s.select_one('link[rel=canonical]')['href']=='https://jowkaritech.com'+URLPATH
assert 'noindex' not in s.select_one('meta[name=robots]')['content']
assert s.select_one('meta[property="og:title"]')['content']==TITLE
passed('descriptive laptop title, heading, canonical, social title and indexability')
text=s.get_text(' ',strip=True)
for phrase in ['Remote appointments only','C$45','C$80','CAD','30 minutes','90 minutes','physical repairs','no guaranteed same-day response']:
 assert phrase.lower() in text.lower(),phrase
passed('published prices and remote-only/hardware boundaries remain explicit')
graph=json.loads(s.select_one('#jowkari-entity-schema').string)['@graph'];service=next(x for x in graph if x.get('@type')=='Service')
assert service['areaServed']=={'@type':'City','name':'North Vancouver'};assert 'Remote laptop' in service['name']
assert not any(k in json.dumps(graph) for k in ['aggregateRating','streetAddress','openingHours'])
passed('service schema matches visible service area with no invented address, hours or reviews')
assert s.select_one('a[href^="mailto:jowkaritech@gmail.com"]')
expected_issues={'Slow computer','Office / Outlook'}
actual={parse_qs(urlsplit(a['href']).query).get('issue',[''])[0] for a in s.select('a[href^="/request-support/?issue="]')}
assert actual==expected_issues
passed('direct email contact and only supported problem-specific enquiry destinations')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');page=ctx.new_page();errors=[];posts=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('request',lambda req:posts.append(req.url) if req.method=='POST' else None)
 if not args.live:
  def challenge(route):
   assert route.request.method=='GET', 'This test must not submit a form'
   route.fulfill(status=200,headers={'Access-Control-Allow-Origin':BASE},json={'ok':True,'token':'synthetic-test-only','expires_at':9999999999999})
  ctx.route('https://jowkari-support.jowkari-1mh.workers.dev/**',challenge)
 try:
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000});page.goto(BASE+URLPATH)
   expect(page.locator('h1')).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.locator('a[href="#repair-or-remote"]').click();expect(page).to_have_url(BASE+URLPATH+'#repair-or-remote')
   expect(page.locator('#repair-or-remote h2')).to_be_visible()
   page.locator('summary').first.click();expect(page.locator('details').first).to_have_attribute('open','')
   if width in [390,1440]:
    page.goto(BASE+URLPATH);page.screenshot(path=str(OUT/('local-'+str(width)+('-live' if args.live else '')+'.png')),full_page=True)
   passed(str(width)+'px: readable layout, working topic anchors and FAQ')
  page.set_viewport_size({'width':1440,'height':1000});page.goto(BASE+URLPATH)
  page.locator('a[href="/request-support/?issue=Slow%20computer"]').click()
  expect(page.locator('#supportIssue')).to_have_value('Slow computer')
  expect(page.locator('#supportSecurity')).to_contain_text('ready',timeout=20000)
  passed('slow-laptop action opens the actual support form with its issue selected')
  page.goto(BASE+URLPATH);page.locator('a[href="/request-support/?issue=Office%20%2F%20Outlook"]').click()
  expect(page.locator('#supportIssue')).to_have_value('Office / Outlook')
  assert not page.locator('[name=consent]').is_checked()
  passed('Outlook action preserves explicit unchecked consent')
  page.goto(BASE+'/support-resources/slow-windows-11/')
  page.locator('#local-laptop-help a').click();expect(page).to_have_url(BASE+URLPATH)
  passed('existing Windows guide connects to the single local service page')
  assert not errors,errors;assert not posts,posts
  passed('no uncaught JavaScript errors and no email/form submissions during this check')
  (OUT/('live-results.json' if args.live else 'results.json')).write_text(json.dumps({'passed':len(checks),'checks':checks,'live':args.live,'no_email_sent':True,'scope':'Chromium; local API challenge mocked, production check uses real challenge. No ranking or inbox-delivery claim.'},indent=2))
 finally:
  browser.close()
  if server:server.shutdown()
