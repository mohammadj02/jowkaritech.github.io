"""Run only after the preview Worker is deployed. Does not use AI or send email."""
import base64, json, random, struct, time, urllib.request, urllib.error, zlib
BASE='https://jowkari-preview.jowkari-1mh.workers.dev'
def request(path,data=None,method='GET'):
    req=urllib.request.Request(BASE+path,method=method,headers={'Origin':'https://jowkaritech.com','Content-Type':'application/json','Accept':'application/json'},data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req,timeout=30) as response:return response.status,json.load(response)
    except urllib.error.HTTPError as exc:
        try:body=json.load(exc)
        except Exception:body={}
        return exc.code,body
status,health=request('/health')
assert status==200 and health.get('storage_ready') and health.get('version')=='studio-2026.10.12', 'New preview service or storage is not live.'
print('PASS: production preview health, version and KV binding')
def chunk(kind,payload):return struct.pack('!I',len(payload))+kind+payload+struct.pack('!I',zlib.crc32(kind+payload)&0xffffffff)
rng=random.Random(123);w,h=240,180
raw=b''.join(b'\x00'+rng.randbytes(w*3) for _ in range(h))
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
image='data:image/png;base64,'+base64.b64encode(png).decode()
design={'name':'JowkariTech automated QA — not a real business','industry':'Test','city':'North Vancouver','pages':{'Home':[{'id':'qaimage','type':'hero','title':'Automated image test','body':'Synthetic test, removed after verification.','image':image}]},'page':'Home'}
status,result=request('/v2/previews',{'design':design},'POST')
assert status==200 and result.get('ok'), 'Preview create failed; inspect the HTTP status and service availability.'
ident=result['id'];key=result['manage_token']
try:
    assert len(result['preview_url'])<120
    fetched=None
    for attempt in range(15):
        code,data=request('/preview/'+ident)
        if code==200 and data.get('ok'):fetched=data;break
        time.sleep(3)
    assert fetched and fetched['design']['pages']['Home'][0]['image']==image, 'Image did not survive the production preview roundtrip.'
    assert 'manage_token' not in fetched and 'manage_hash' not in fetched
    print('PASS: short link and production image roundtrip for',len(image),'characters of image data')
finally:
    code,_=request('/v2/previews/'+ident,{'manage_token':key},'DELETE')
    assert code==200,'Synthetic preview cleanup failed.'
    print('PASS: synthetic public preview removed')
