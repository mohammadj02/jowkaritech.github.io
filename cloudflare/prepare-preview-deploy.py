"""Prepare the existing preview Worker's KV binding; never print credentials."""
import json, os, re, urllib.request, urllib.error
from pathlib import Path
account=os.environ.get('CLOUDFLARE_ACCOUNT_ID','').strip()
token=os.environ.get('CLOUDFLARE_API_TOKEN','').strip()
if not re.fullmatch(r'[a-fA-F0-9]{32}',account) or not token:
    raise SystemExit('Missing or invalid Cloudflare deployment secrets. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in GitHub Actions secrets.')
base='https://api.cloudflare.com/client/v4/accounts/'+account

def api(path,method='GET',data=None,optional=False):
    req=urllib.request.Request(base+path,method=method,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req,timeout=30) as response: result=json.load(response)
    except urllib.error.HTTPError as exc:
        if optional and exc.code==404:return None
        raise SystemExit('Cloudflare API rejected the deployment setup (HTTP '+str(exc.code)+'). Check Workers Scripts Edit, Workers KV Storage Edit and account access.') from None
    if not result.get('success'):
        raise SystemExit('Cloudflare did not accept the storage setup. No credentials were logged.')
    return result

settings=api('/workers/scripts/jowkari-preview/settings',optional=True)
namespace=None
if settings:
    for binding in settings.get('result',{}).get('bindings',[]):
        if binding.get('name')=='PREVIEW_KV' and binding.get('type')=='kv_namespace':
            namespace=binding.get('namespace_id') or binding.get('id')
if not namespace:
    page=1
    while True:
        response=api('/storage/kv/namespaces?per_page=100&page='+str(page))
        for item in response.get('result',[]):
            if item.get('title')=='jowkari-preview-storage':namespace=item['id'];break
        if namespace or page>=response.get('result_info',{}).get('total_pages',1):break
        page+=1
if not namespace:
    namespace=api('/storage/kv/namespaces','POST',{'title':'jowkari-preview-storage'})['result']['id']
if not re.fullmatch(r'[a-fA-F0-9]{32}',namespace):raise SystemExit('Cloudflare returned an invalid namespace identifier.')
config={'name':'jowkari-preview','main':'preview-worker.js','compatibility_date':'2025-09-01','workers_dev':True,'keep_vars':True,'kv_namespaces':[{'binding':'PREVIEW_KV','id':namespace}]}
Path('cloudflare/wrangler.preview.runtime.json').write_text(json.dumps(config,indent=2))
print('Preview storage binding ready. Existing storage reused when available. No domain or DNS settings changed.')
