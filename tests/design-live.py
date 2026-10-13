"""Production-only validation after release. One owner-only QA enquiry, no customer contact."""
from pathlib import Path
import json, os, time, urllib.request, urllib.error
from playwright.sync_api import sync_playwright, expect
BASE='https://jowkaritech.com';OUT=Path('test-results/live');OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def passed(name):checks.append(name);print('PASS:',name,flush=True)
def get(url):
 request=urllib.request.Request(url,headers={'User-Agent':'JowkariTech-Release-QA/1.0','Cache-Control':'no-cache'})
 with urllib.request.urlopen(request,timeout=30) as response:return response.read(),response.headers.get('content-type','')
for attempt in range(45):
 try:
  html,mime=get(BASE+'/?release=editorial-1')
  if b'editorial-1' in html and b'Good businesses.' in html:break
 except urllib.error.URLError:pass
 time.sleep(4)
else:raise AssertionError('New homepage is not yet served on the production domain.')
passed('production domain serves the new editorial homepage')
for path in ['/portfolio.html','/demo/roofing/','/demo/plumbing/','/demo/electrician/','/jowkari-sites/','/assets/site/design.css','/assets/site/site.js','/lead.js','/assets/site/roofing-preview.webp','/assets/site/plumbing-preview.webp','/assets/site/electrician-preview.webp','/assets/site/north-shore.webp']:
 body,mime=get(BASE+path+'?release=editorial-1');assert len(body)>100,path
 if path.endswith('.js'):assert 'javascript' in mime,path+' has incorrect MIME type'
passed('production portfolio, demos, builder, images and scripts respond successfully')
for worker in ['jowkari-ai','jowkari-preview']:
 body,_=get('https://'+worker+'.jowkari-1mh.workers.dev/health');health=json.loads(body);assert health.get('ok'),worker
 assert health.get('ai_binding') if worker=='jowkari-ai' else health.get('storage_ready'),worker
passed('real AI and preview services report working bindings')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');page=context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
 try:
  page.goto(BASE+'/?release=editorial-1',wait_until='networkidle');expect(page.locator('h1')).to_contain_text('Good businesses.')
  page.locator('#featuredImage').evaluate('async img=>{await img.decode()}');page.screenshot(path=str(OUT/'production-homepage.png'),full_page=True)
  page.locator('[data-demo-tab=plumbing]').click();expect(page.locator('#featuredLink')).to_have_attribute('href','/demo/plumbing/');page.locator('#featuredLink').click();expect(page.locator('.demoNotice')).to_contain_text('fictional');passed('real-domain homepage demo switching and navigation work')
  page.goto(BASE+'/jowkari-sites/?quick=1&name=Release+QA+Only&industry=Plumber&city=North+Vancouver&services=Leak+repair,Fixture+installation');expect(page.frame_locator('#siteFrame').locator('h1')).to_be_visible()
  page.locator('[data-tab=settings]').click();page.once('dialog',lambda dialog:dialog.accept());page.locator('[data-action=ai]').click();expect(page.locator('#toast')).to_contain_text('AI draft applied',timeout=35000);passed('real AI writing call succeeds from the production Studio')
  # Explicitly one test submission through the production form, addressed to its configured owner.
  # This is not a sale, a lead, or a customer request. Do not retry ambiguous delivery automatically.
  if os.environ.get('SEND_OWNER_QA','0')=='1':
   page.goto(BASE+'/?release=editorial-1');page.locator('#leadName').fill('JowkariTech release QA — automated test')
   page.locator('#leadBusiness').fill('QA ONLY — editorial release')
   page.locator('#leadEmail').fill('jowkaritech@gmail.com')
   page.locator('#leadMessage').fill('QA ONLY: This is the requested end-to-end form test for the JowkariTech editorial redesign. No customer, sale or booking. No reply is needed. Test code JT-EDITORIAL-20261012.')
   page.locator('#contactForm [name=subject]').evaluate("e=>e.value='[QA ONLY] JowkariTech editorial release JT-EDITORIAL-20261012'")
   page.locator('#contactForm [type=submit]').click();expect(page.locator('.formStatus')).to_contain_text('accepted by our form provider',timeout=25000)
   passed('one owner-only QA enquiry accepted by the real form provider; inbox receipt checked separately')
  assert not errors,errors;passed('no uncaught JavaScript errors in the live browser flow')
  (OUT/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'owner_test_sent':os.environ.get('SEND_OWNER_QA')=='1'},indent=2))
 except Exception:
  page.screenshot(path=str(OUT/'production-failure.png'),full_page=True);print('LIVE BROWSER ERRORS:',errors,flush=True);raise
 finally:browser.close()
