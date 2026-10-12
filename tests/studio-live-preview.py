"""Production smoke checks. Uses synthetic data only; no AI generation or email."""
import base64, json, random, struct, time, urllib.request, urllib.error, zlib
BASE='https://jowkari-preview.jowkari-1mh.workers.dev'
def request(path,data=None,method='GET'):
    req=urllib.request.Request(BASE+path,method=method,headers={'Origin':'https://jowkaritech.com','Content-Type':'application/json','Accept':'application/json','User-Agent':'JowkariTech-Release-Check/1.0'},data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req,timeout=30) as response:
            try:body=json.load(response)
            except Exception:body={'error':'non_json_response'}
            return response.status,body
    except urllib.error.HTTPError as exc:
        try:body=json.load(exc)
        except Exception:body={'error':'non_json_response'}
        return exc.code,body
status,health=0,{}
for attempt in range(20):
    status,health=request('/health?release=studio-20261012')
    if status==200 and health.get('storage_ready') and health.get('version')=='studio-2026.10.12':break
    print('Waiting for edge rollout:',status,'version=',health.get('version'),'storage=',health.get('storage_ready'),'error=',health.get('error'),flush=True)
    time.sleep(3)
assert status==200 and health.get('storage_ready') and health.get('version')=='studio-2026.10.12', 'New preview service or storage is not live.'
print('PASS: production preview health, version and KV binding',flush=True)
def chunk(kind,payload):return struct.pack('!I',len(payload))+kind+payload+struct.pack('!I',zlib.crc32(kind+payload)&0xffffffff)
rng=random.Random(123);w,h=240,180
raw=b''.join(b'\x00'+rng.randbytes(w*3) for _ in range(h))
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
image='data:image/png;base64,'+base64.b64encode(png).decode()
design={'name':'JowkariTech automated QA — not a real business','industry':'Test','city':'North Vancouver','pages':{'Home':[{'id':'qaimage','type':'hero','title':'Automated image test','body':'Synthetic test, removed after verification.','image':image}]},'page':'Home'}
status,result=request('/v2/previews',{'design':design},'POST')
assert status==200 and result.get('ok'), 'Preview create failed: HTTP '+str(status)+' / '+str(result.get('error'))+' / '+str(result.get('message'))
ident=result['id'];key=result['manage_token']
try:
    assert len(result['preview_url'])<120
    fetched=None
    for attempt in range(20):
        code,data=request('/preview/'+ident)
        if code==200 and data.get('ok'):fetched=data;break
        time.sleep(3)
    assert fetched and fetched['design']['pages']['Home'][0]['image']==image, 'Image did not survive the production preview roundtrip.'
    assert 'manage_token' not in fetched and 'manage_hash' not in fetched
    print('PASS: short link and production image roundtrip for',len(image),'characters of image data',flush=True)
finally:
    code,_=request('/v2/previews/'+ident,{'manage_token':key},'DELETE')
    assert code==200,'Synthetic preview cleanup failed.'
    print('PASS: synthetic public preview removed',flush=True)

def fetch_text(url):
    req=urllib.request.Request(url,headers={'User-Agent':'JowkariTech-Release-Check/1.0','Cache-Control':'no-cache'})
    with urllib.request.urlopen(req,timeout=30) as response:return response.read().decode(),response.headers.get('Content-Type','')
for attempt in range(30):
    try:
        html,_=fetch_text('https://jowkaritech.com/jowkari-sites/?release-check=20261012')
        if 'studio.mjs' in html and 'Publish / export' in html:break
    except (urllib.error.URLError,UnicodeError):pass
    time.sleep(4)
else:raise AssertionError('GitHub Pages has not yet served the Studio editor.')
for name in ['core.mjs','studio.mjs','studio.css']:
    text,mime=fetch_text('https://jowkaritech.com/jowkari-sites/'+name+'?release-check=20261012')
    assert len(text)>100,'Missing production asset: '+name
    if name.endswith('.mjs'):assert 'javascript' in mime,'Wrong module MIME type: '+name+' '+mime
print('PASS: production builder HTML, JavaScript modules and stylesheet are reachable',flush=True)
