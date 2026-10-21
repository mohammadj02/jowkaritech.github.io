"""Build assets or validate existing deployment credentials. No customer files are handled."""
import hashlib,json,os,re,sys,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parent
NAME='jowkari-catalog-prep'

def build():
 out=ROOT/'public/vendor';out.mkdir(exist_ok=True)
 manifest=out/'provenance.json'
 files={'xlsx.mini.min.js':'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js','LICENSE':'https://cdn.sheetjs.com/xlsx-0.20.3/package/LICENSE'}
 if manifest.exists():
  saved=json.loads(manifest.read_text())
  for name in files:
   assert hashlib.sha256((out/name).read_bytes()).hexdigest()==saved['sha256'][name], 'Vendored dependency changed unexpectedly.'
 else:
  hashes={}
  for name,url in files.items():
   req=urllib.request.Request(url,headers={'User-Agent':'JowkariTech-CatalogPrep-Build/0.1'})
   with urllib.request.urlopen(req,timeout=45) as response:data=response.read(3*1024*1024)
   assert len(data)>100 and b'<html' not in data[:200].lower(),'Dependency endpoint returned unexpected content.'
   if name.endswith('.js'):assert b'0.20.3' in data,'Unexpected parser version.'
   (out/name).write_bytes(data);hashes[name]=hashlib.sha256(data).hexdigest()
  manifest.write_text(json.dumps({'package':'SheetJS Community Edition','version':'0.20.3','source':files,'sha256':hashes},indent=2)+'\n')
 (ROOT/'wrangler.json').write_text(json.dumps({'name':NAME,'main':'worker.mjs','compatibility_date':'2026-10-01','workers_dev':True,'assets':{'directory':'./public','binding':'ASSETS','run_worker_first':True},'vars':{'JOWKARI_PRODUCT':'catalog-prep-v1'},'observability':{'enabled':False}},indent=2)+'\n')
 print('Pinned parser, license and static Worker configuration are ready. No new billing plan or DNS changes.')

def preflight():
 account=os.environ.get('CLOUDFLARE_ACCOUNT_ID','').strip();token=os.environ.get('CLOUDFLARE_API_TOKEN','').strip()
 if not re.fullmatch('[a-fA-F0-9]{32}',account) or not token:raise SystemExit('Existing Cloudflare deployment secrets are missing. Set them securely in GitHub Actions, not in chat.')
 def api(path,allow_missing=False):
  req=urllib.request.Request('https://api.cloudflare.com/client/v4/accounts/'+account+path,headers={'Authorization':'Bearer '+token,'Accept':'application/json'})
  try:
   with urllib.request.urlopen(req,timeout=30) as response:data=json.load(response)
  except urllib.error.HTTPError as error:
   if error.code==404 and allow_missing:return None
   raise SystemExit('Cloudflare access check failed (HTTP '+str(error.code)+'). No existing service was changed.') from None
  if not data.get('success'):raise SystemExit('Cloudflare rejected the access check. No credentials were logged.')
  return data.get('result')
 current=api('/workers/scripts/'+NAME+'/settings',True)
 if current is not None and not any(b.get('name')=='JOWKARI_PRODUCT' and b.get('text')=='catalog-prep-v1' for b in current.get('bindings',[])):raise SystemExit('The intended Worker name is already in use by an unrecognized deployment. Stopped without overwriting it.')
 sub=api('/workers/subdomain').get('subdomain','')
 if not re.fullmatch('[a-z0-9-]+',sub):raise SystemExit('An existing workers.dev subdomain is required. No domain settings were changed.')
 url='https://'+NAME+'.'+sub+'.workers.dev'
 out=ROOT/'test-results';out.mkdir(exist_ok=True);(out/'deployment-url.txt').write_text(url+'\n')
 if os.environ.get('GITHUB_OUTPUT'):
  with open(os.environ['GITHUB_OUTPUT'],'a') as stream:stream.write('url='+url+'\n')
 print('Deployment access verified for the isolated Catalog Prep Worker.')

if __name__=='__main__':
 if len(sys.argv)>1 and sys.argv[1]=='preflight':preflight()
 else:build()
