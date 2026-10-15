"""Prepare ONLY jowkari-support. Never print credential values or store request bodies."""
import argparse,json,os,re,secrets,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ACCOUNT=os.environ.get('CLOUDFLARE_ACCOUNT_ID','').strip();TOKEN=os.environ.get('CLOUDFLARE_API_TOKEN','').strip()
if not re.fullmatch('[0-9a-fA-F]{32}',ACCOUNT) or not TOKEN:raise SystemExit('Existing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN deployment secrets are required.')
BASE='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT

def api(path,method='GET',body=None,missing_ok=False):
 req=urllib.request.Request(BASE+path,method=method,headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode())
 try:
  with urllib.request.urlopen(req,timeout=30) as response:j=json.load(response)
 except urllib.error.HTTPError as err:
  if missing_ok and err.code==404:return None
  raise SystemExit('Cloudflare setup request failed (HTTP '+str(err.code)+'). Check existing Workers Scripts / KV permissions. No credentials logged.') from None
 except urllib.error.URLError:raise SystemExit('Cloudflare API could not be reached. No configuration values were logged.') from None
 if not j.get('success'):raise SystemExit('Cloudflare did not accept the operation. Review token permissions in the account.')
 return j.get('result')

def prepare():
 source=api('/workers/scripts/jowkari-preview/settings')
 binding=next((b for b in source.get('bindings',[]) if b.get('name')=='PREVIEW_KV' and b.get('type')=='kv_namespace'),None)
 if not binding:raise SystemExit('The existing preview KV binding could not be resolved. No new storage or infrastructure was created.')
 namespace=binding.get('namespace_id') or binding.get('id')
 if not re.fullmatch('[0-9a-fA-F]{32}',namespace or ''):raise SystemExit('The existing KV namespace identifier was not valid.')
 config={'name':'jowkari-support','main':'support-worker.mjs','compatibility_date':'2026-10-01','workers_dev':True,'keep_vars':True,'observability':{'enabled':False},'kv_namespaces':[{'binding':'SUPPORT_STATE','id':namespace}],'ratelimits':[{'name':'SUPPORT_RATE','namespace_id':'2026101501','simple':{'limit':5,'period':60}},{'name':'CHALLENGE_RATE','namespace_id':'2026101502','simple':{'limit':20,'period':60}}]}
 (ROOT/'cloudflare/wrangler.support.runtime.json').write_text(json.dumps(config,indent=2))
 print('Support configuration prepared. Reusing existing KV only for isolated, non-PII receipt metadata. No DNS or other Worker changes.')

def configure_secrets():
 # This is the real, pre-existing owner-configured form key, not an invented integration.
 match=re.search(r"access_key\s*[:=]\s*['\"]([a-fA-F0-9-]{36})['\"]",(ROOT/'lead.js').read_text())
 if not match:raise SystemExit('Existing Web3Forms configuration not found. Set an approved owner-notification provider before launch.')
 key=match.group(1);print('::add-mask::'+key)
 existing=api('/workers/scripts/jowkari-support/secrets') or []
 names={x.get('name') for x in existing}
 api('/workers/scripts/jowkari-support/secrets','PUT',{'name':'SUPPORT_FORM_KEY','text':key,'type':'secret_text'})
 if 'SUPPORT_CHALLENGE_SECRET' not in names:
  signing=secrets.token_urlsafe(48);print('::add-mask::'+signing)
  api('/workers/scripts/jowkari-support/secrets','PUT',{'name':'SUPPORT_CHALLENGE_SECRET','text':signing,'type':'secret_text'})
 print('Support email and signing secrets configured securely. Existing signing secret preserved when present.')

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['prepare','secrets']);a=parser.parse_args()
 prepare() if a.mode=='prepare' else configure_secrets()
