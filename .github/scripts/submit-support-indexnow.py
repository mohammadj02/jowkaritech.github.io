"""Single post-deployment IndexNow batch. Acceptance is not crawling or indexing."""
from pathlib import Path
from urllib.parse import urlsplit
import datetime,json,re,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'test-results/support-live';OUT.mkdir(parents=True,exist_ok=True)
BASE='https://jowkaritech.com/'
result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'google_search_console_submitted':False,'google_access_note':'GSC Wizard returned payment_required: trial ended. Use the existing Search Console property manually.','accepted':False,'indexed':False}
try:
 files=list(ROOT.glob('*indexnow*.txt'));assert len(files)==1,'Expected exactly one existing IndexNow ownership file.'
 key=files[0].read_text().strip();assert re.fullmatch(r'[A-Za-z0-9-]{8,128}',key),'Existing key format invalid.'
 location=BASE+files[0].name
 with urllib.request.urlopen(location,timeout=25) as response:assert response.status==200 and response.read().decode().strip()==key,'Published key does not match.'
 result['ownership_file_verified']=True
 urls=json.loads((ROOT/'remote-it-release.json').read_text())['new_public_urls']+[BASE,BASE+'services.html',BASE+'about.html',BASE+'contact.html']
 urls=list(dict.fromkeys(urls));assert all(urlsplit(u).netloc=='jowkaritech.com' and not urlsplit(u).query for u in urls)
 for u in urls:
  with urllib.request.urlopen(u,timeout=25) as response:assert response.status==200,'A submitted page is not live.'
 result['urls']=urls;result['attempted']=len(urls)
 payload={'host':'jowkaritech.com','key':key,'keyLocation':location,'urlList':urls}
 request=urllib.request.Request('https://api.indexnow.org/indexnow',method='POST',headers={'Content-Type':'application/json; charset=utf-8','User-Agent':'JowkariTech-Remote-Support-Release/1.0'},data=json.dumps(payload).encode())
 try:
  with urllib.request.urlopen(request,timeout=30) as response:code=response.status
 except urllib.error.HTTPError as err:code=err.code
 result.update({'http_status':code,'accepted':code in [200,202],'key_validation_pending':code==202,'note':'Accepted means the batch was received, not that a page has been crawled, indexed or ranked.'})
 print('IndexNow:',len(urls),'public URLs; HTTP',code,'; accepted =',result['accepted'],'; no indexing guarantee.')
except Exception as err:
 result['error_type']=type(err).__name__;result['note']='Submission was not confirmed. The website remains deployed. Follow the manual search instructions.'
 print('IndexNow submission not confirmed:',type(err).__name__)
finally:(OUT/'search-submission.json').write_text(json.dumps(result,indent=2))
