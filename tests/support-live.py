"""Production validation. --send-owner-qa submits ONE synthetic owner-only request, never a customer message."""
import argparse,json,time,urllib.request,urllib.error
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/support-live';OUT.mkdir(parents=True,exist_ok=True)
SITE='https://jowkaritech.com';API='https://jowkari-support.jowkari-1mh.workers.dev';checks=[];receipt=None

def request(url,data=None,origin=SITE):
 req=urllib.request.Request(url,method='POST' if data is not None else 'GET',headers={'Origin':origin,'User-Agent':'JowkariTech-Remote-Support-QA/1.0','Accept':'application/json','Content-Type':'application/json','Cache-Control':'no-cache'},data=None if data is None else json.dumps(data).encode())
 try:
  with urllib.request.urlopen(req,timeout=25) as r:return r.status,r.read(),dict(r.headers)
 except urllib.error.HTTPError as err:return err.code,err.read(),dict(err.headers)
def passed(name):checks.append(name);print('PASS:',name,flush=True)
def backend():
 for attempt in range(30):
  try:
   code,body,_=request(API+'/health');j=json.loads(body)
   if code==200 and j.get('ready') and j.get('release')=='remote-it-20261015':break
  except (urllib.error.URLError,ValueError):pass
  time.sleep(3)
 else:raise AssertionError('Support Worker is not ready with the intended release and bindings.')
 passed('support Worker health confirms deployed release and required bindings')
 code,body,headers=request(API+'/v1/challenge');j=json.loads(body);assert code==200 and j.get('token') and j.get('expires_at')
 assert headers.get('Access-Control-Allow-Origin',headers.get('access-control-allow-origin'))==SITE
 passed('real signed form challenge and production-origin CORS work')
 code,body,_=request(API+'/v1/requests',{})
 assert code==422 and not json.loads(body).get('ok');passed('real endpoint rejects incomplete requests before notification')
 code,_,_=request(API+'/v1/challenge',origin='https://not-jowkari.invalid');assert code==403;passed('unapproved browser origins are rejected')

def website(send=False):
 global receipt
 for attempt in range(45):
  code,body,_=request(SITE+'/?release=remote-it-20261015')
  if code==200 and b'remote-it-home' in body:break
  time.sleep(4)
 else:raise AssertionError('The IT-first homepage is not live yet.')
 urls=json.loads((ROOT/'remote-it-release.json').read_text())['new_public_urls']
 for u in urls:
  code,body,_=request(u);assert code==200,u
  s=BeautifulSoup(body,'html.parser');assert s.select_one('link[rel=canonical]')['href']==u;assert len(s.select('h1'))==1;assert 'noindex' not in s.select_one('meta[name=robots]')['content']
 passed(str(len(urls))+' new production routes return 200 with the intended canonical and indexability')
 code,body,_=request(SITE+'/sitemap.xml');assert code==200 and all(u.encode() in body for u in urls);passed('production sitemap contains the new pages')
 from playwright.sync_api import sync_playwright,expect
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   page.goto(SITE+'/?release=remote-it-20261015',wait_until='domcontentloaded');expect(page.locator('#remote-it-home')).to_be_visible();page.screenshot(path=str(OUT/'live-homepage.png'))
   page.locator('#remote-it-home a[href="/request-support/"]').first.click();expect(page.locator('#supportSecurity')).to_contain_text('ready',timeout=20000);passed('live homepage action opens the ready, working support form')
   if send:
    page.locator('[name=name]').fill('JowkariTech — automated release QA')
    page.locator('[name=email]').fill('jowkaritech@gmail.com')
    page.locator('[name=device]').select_option('Laptop');page.locator('[name=os]').select_option('Windows 11');page.locator('[name=issue]').select_option('Other')
    page.locator('textarea[name=description]').fill('QA ONLY — this is the authorized end-to-end test for remote support release JT-REMOTE-IT-20261015. Not a customer, sale, appointment or payment. No reply is needed. Please exclude it from business conversion counts.')
    page.locator('[name=preferred_time]').fill('QA ONLY — no appointment requested');page.locator('[name=timezone]').select_option('America/Vancouver');page.locator('[name=consent]').check();page.wait_for_timeout(2500)
    with page.expect_response(lambda r:r.url==API+'/v1/requests' and r.request.method=='POST',timeout=25000) as response:page.locator('#supportRequest [type=submit]').click()
    r=response.value;j=r.json();assert r.status==201 and j.get('status')=='provider_accepted','Real notification was not confirmed: HTTP '+str(r.status)+' / '+str(j.get('code'))
    receipt=j['reference'];expect(page.locator('#supportStatus')).to_contain_text(receipt);page.screenshot(path=str(OUT/'live-request-confirmed.png'),full_page=True)
    passed('one owner-only synthetic request accepted by the real email provider; reference '+receipt)
   page.goto(SITE+'/jowkari-sites/?quick=1&name=Remote+Release+QA&industry=Plumber');expect(page.frame_locator('#siteFrame').locator('h1')).to_be_visible();passed('existing live website builder still creates a project')
   for path in ['/demo/roofing/','/demo/plumbing/','/demo/electrician/']:
    page.goto(SITE+path);expect(page.locator('h1')).to_be_visible()
   passed('three original production demos still load')
   assert not errors,errors;passed('no uncaught JavaScript errors in the production browser checks')
  finally:browser.close()

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['backend','website']);parser.add_argument('--send-owner-qa',action='store_true');args=parser.parse_args()
 backend()
 if args.mode=='website':website(args.send_owner_qa)
 (OUT/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'receipt':receipt,'owner_notification_test_sent':bool(receipt),'inbox_receipt_verified':False,'note':'A provider acknowledgement is not inbox receipt; verify through the owner mailbox separately.'},indent=2))
