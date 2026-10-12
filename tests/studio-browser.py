import functools, json, threading, time, zipfile
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'studio';OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}'
im=Image.new('RGB',(1000,700),'#426954');d=ImageDraw.Draw(im);d.rectangle((60,60,940,640),fill='#d8bd8a');d.text((420,340),'UPLOAD TEST',fill='#18252d');im.save(OUT/'upload-test.png')
report=[]
def passed(name):report.append(name);print('PASS:',name,flush=True)
def decoded(image):
    expect(image).to_be_visible()
    image.scroll_into_view_if_needed()
    return image.evaluate('async el => { await el.decode(); return el.complete && el.naturalWidth > 0; }')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(viewport={'width':1600,'height':1000},accept_downloads=True)
 context.tracing.start(screenshots=True,snapshots=True,sources=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
 try:
  page.goto(BASE+'/jowkari-sites/');expect(page.locator('#startDialog')).to_be_visible()
  page.locator('#startForm [name=name]').fill('Capilano Test Services')
  page.locator('#startForm [name=industry]').fill('Plumber')
  page.locator('#startForm [name=services]').fill('Leak repairs\nDrain service\nInstallations')
  page.locator('#startForm [name=phone]').fill('+16045550123')
  page.locator('#startForm [name=email]').fill('hello@example.com')
  page.locator('#startForm [type=submit]').click()
  frame=page.frame_locator('#siteFrame');expect(frame.locator('h1')).to_be_visible();passed('create business website')
  expect(frame.locator('h3')).to_have_text(['Leak repairs','Drain service','Installations']);passed('custom services retained')
  frame.locator('[data-kind=hero] [data-image-slot]').click()
  page.locator('#inspector [data-action=upload-section]').click()
  page.locator('#imageUpload').set_input_files(str(OUT/'upload-test.png'))
  image=frame.locator('[data-kind=hero] img');assert decoded(image)
  assert image.get_attribute('src').startswith('data:image/webp;base64,');passed('uploaded image displays and decodes')
  page.screenshot(path=str(OUT/'desktop.png'),full_page=True)
  page.locator('#inspector [data-field=title]').fill('Local plumbing, without the runaround.')
  page.locator('#inspector [data-field=body]').click()
  expect(frame.locator('h1')).to_have_text('Local plumbing, without the runaround.');passed('inspector edits update canvas')
  page.locator('#inspector [data-field=link]').fill('https://example.com/contact')
  page.locator('#inspector [data-field=title]').click()
  expect(frame.locator('[data-kind=hero] a.siteButton')).to_have_attribute('href','https://example.com/contact');passed('custom button link retained')
  frame.locator('h1').fill('Typed directly onto my website')
  frame.locator('[data-kind=hero] p').click()
  expect(page.locator('#inspector [data-field=title]')).to_have_value('Typed directly onto my website');passed('inline text edit updates model')
  page.locator('[data-tab=add]').click();page.locator('#leftPanel [data-block=gallery]').click()
  expect(frame.locator('[data-kind=gallery]')).to_have_count(1);passed('add section')
  page.locator('#undo').click();expect(frame.locator('[data-kind=gallery]')).to_have_count(0)
  page.locator('#redo').click();expect(frame.locator('[data-kind=gallery]')).to_have_count(1);passed('undo and redo')
  page.locator('[data-tab=pages]').click();rows=page.locator('.sectionRow');last_id=rows.last.get_attribute('data-id')
  rows.last.drag_to(rows.first);expect(rows.first).to_have_attribute('data-id',last_id);passed('drag-and-drop reorders sections')
  page.locator('#undo').click();page.wait_for_timeout(150)
  rows.last.locator('.rowText').click();page.locator('#inspector [data-action=duplicate]').click()
  expect(frame.locator('[data-kind=gallery]')).to_have_count(2);passed('duplicate section')
  expect(page.locator('#saveStatus')).to_contain_text('Saved on this browser')
  page.reload();frame=page.frame_locator('#siteFrame');expect(frame.locator('h1')).to_have_text('Typed directly onto my website')
  assert decoded(frame.locator('[data-kind=hero] img'));passed('IndexedDB draft and image survive reload')
  page.once('dialog',lambda dialog:dialog.accept('About Us'))
  page.locator('#leftPanel [data-action=add-page]').click()
  expect(page.locator('[data-page="About Us"]')).to_have_count(1);passed('add page')
  page.locator('[data-page=Home]').click();page.locator('#preview').click()
  frame.locator('nav a[href="#page-1"]').click()
  expect(frame.locator('main.page:not([hidden])')).to_have_attribute('data-page','About Us');passed('preview page navigation works')
  frame.locator('.brand').click();expect(frame.locator('main.page:not([hidden])')).to_have_attribute('data-page','Home');passed('preview home navigation works')
  page.locator('[data-device=mobile]').click();page.wait_for_timeout(300)
  assert page.locator('#frameWrap').bounding_box()['width']<=391;passed('phone preview viewport')
  page.locator('#preview').click();page.locator('[data-device=desktop]').click()
  page.locator('#publish').click()
  with page.expect_download() as dl:page.locator('#exportZIP').click()
  dl.value.save_as(str(OUT/'website.zip'))
  with zipfile.ZipFile(OUT/'website.zip') as z:
   assert set(z.namelist())=={'index.html','project.json','READ-ME.txt'}
   html=z.read('index.html').decode();assert 'data:image/webp;base64,' in html;assert 'contenteditable="true"' not in html
   (OUT/'exported.html').write_text(html)
  passed('ZIP has complete static website, photo, backup and hosting instructions')
  exported=context.new_page();exported.goto(BASE+'/test-results/studio/exported.html')
  expect(exported.locator('h1')).to_be_visible();assert decoded(exported.locator('[data-kind=hero] img'));passed('exported website renders independently')
  exported.locator('nav a[href="#page-1"]').click();expect(exported.locator('main:not([hidden])')).to_have_attribute('data-page','About Us');passed('exported website navigation works')
  records={}
  def route_api(route):
   req=route.request;headers={'access-control-allow-origin':BASE,'access-control-allow-methods':'GET,POST,DELETE,OPTIONS','access-control-allow-headers':'content-type,accept'}
   if req.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
   if req.method=='POST':
    data=req.post_data_json;ident=data.get('id','a'*32)
    record={'ok':True,'id':ident,'design':data['design'],'manage_token':'b'*64,'expires_at':int(time.time()*1000)+1800000,'preview_url':BASE+'/jowkari-sites/?preview_id='+ident,'kind':'preview'};records[ident]=record
    route.fulfill(status=200,headers=headers,json=record);return
   ident=req.url.rsplit('/',1)[-1]
   route.fulfill(status=200 if ident in records else 410,headers=headers,json=records.get(ident,{'error':'expired_or_missing'}))
  context.route('https://jowkari-preview.jowkari-1mh.workers.dev/**',route_api)
  page.locator('#share').click();expect(page.locator('#shareURL')).to_be_visible()
  link=page.locator('#shareURL').input_value();assert len(link)<140;passed('short preview-link client flow (mocked API)')
  shared=context.new_page();shared.goto(link);expect(shared.frame_locator('#siteFrame').locator('h1')).to_be_visible()
  assert decoded(shared.frame_locator('#siteFrame').locator('[data-kind=hero] img'));passed('shared preview restores image (mocked API)')
  bad=context.new_page();bad.goto(BASE+'/jowkari-sites/?preview_id='+'f'*32)
  expect(bad.locator('.unavailable')).to_be_visible();assert 'expired' in bad.locator('.unavailable').inner_text().lower();passed('expired preview has a useful recovery page')
  mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  mp=mobile.new_page();mp.goto(BASE+'/jowkari-sites/?quick=1&name=Mobile+Business&industry=Plumber')
  expect(mp.frame_locator('#siteFrame').locator('h1')).to_be_visible()
  assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
  mp.locator('[data-tab=add]').click();expect(mp.locator('#leftPanel')).to_be_visible()
  mp.screenshot(path=str(OUT/'mobile.png'),full_page=True);passed('mobile controls available without horizontal overflow')
  assert not errors,errors;passed('no uncaught JavaScript errors')
  (OUT/'results.json').write_text(json.dumps({'passed':len(report),'tests':report},indent=2))
 except Exception:
  print('PAGE ERRORS:',errors,flush=True)
  page.screenshot(path=str(OUT/'failure.png'),full_page=True)
  raise
 finally:
  context.tracing.stop(path=str(OUT/'trace.zip'))
  browser.close();server.shutdown()
