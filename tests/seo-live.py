"""Read-only production smoke checks: no email, payment, AI generation or profile changes."""
from pathlib import Path
from urllib.parse import urlsplit
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,time,urllib.request,urllib.error,xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results'/'seo-live';OUT.mkdir(parents=True,exist_ok=True)
BASE='https://jowkaritech.com/';NS='http://www.sitemaps.org/schemas/sitemap/0.9'
manifest=json.loads((ROOT/'seo-release.json').read_text());checks=[]
def fetch(url):
 request=urllib.request.Request(url,headers={'User-Agent':'JowkariTech-SEO-Release-Check/1.0','Cache-Control':'no-cache'})
 try:
  with urllib.request.urlopen(request,timeout=25) as response:return response.status,response.read(),dict(response.headers),response.url
 except urllib.error.HTTPError as error:return error.code,error.read(),dict(error.headers),error.url
for attempt in range(45):
 try:
  code,body,_,_=fetch(BASE+'services.html?release=local-search-20261012')
  if code==200 and b'jowkari-entity-schema' in body and b'Website design &amp; practical AI services.' in body:break
 except urllib.error.URLError:pass
 time.sleep(4)
else:raise AssertionError('New service page is not yet served by GitHub Pages.')
checks.append('new SEO release is live on the production domain')
def page_check(url):
 code,body,headers,final=fetch(url+'?release=local-search-20261012');assert code==200,url+' HTTP '+str(code)
 s=BeautifulSoup(body,'html.parser');assert len(s.select('link[rel=canonical]'))==1 and s.select_one('link[rel=canonical]')['href']==url,url+' canonical'
 assert s.html['lang']=='en-CA' and 'noindex' not in s.select_one('meta[name=robots]')['content'],url+' language/indexability'
 graph=json.loads(s.select_one('#jowkari-entity-schema').string)['@graph'];assert any(x.get('@id')==BASE+'#org' for x in graph),url+' organization'
 return {'url':url,'status':code,'canonical':url,'title':s.title.get_text(),'indexable':True}
with ThreadPoolExecutor(max_workers=5) as pool:pages=list(pool.map(page_check,manifest['public_urls']))
checks.append(str(len(pages))+' canonical marketing/resource pages serve the new metadata and entity markup')
code,body,headers,_=fetch(BASE+'sitemap.xml?release=local-search-20261012');assert code==200
urls={e.text for e in ET.fromstring(body).findall('.//{'+NS+'}loc')};assert urls==set(manifest['public_urls'])
checks.append('live sitemap contains exactly the 25 intended canonical URLs')
for path in ['seo.css','seo-context.js']:
 code,body,headers,_=fetch(BASE+path+'?release=local-search-20261012');assert code==200 and len(body)>300,path
 if path.endswith('.js'):assert 'javascript' in headers.get('Content-Type',headers.get('content-type','')),path+' MIME'
checks.append('new stylesheet and script are served with usable content types')
for path in ['__seo_missing__/missing-page-20261012.html','tests/studio-core.test.mjs','cloudflare/preview-worker.js','LAUNCH_CHECKLIST.html','seo-release.json']:
 code,body,_,_=fetch(BASE+path);assert code==404,path+' should return 404, got '+str(code)
 assert b'noindex' in body,path+' recovery page should be noindex'
checks.append('real missing URLs and excluded development files return the noindex 404 page')
for p in ['robots.txt','googlebf98d954bb103693.html','jowkaritech-20261006-indexnow-8f3a62c1.txt']:
 code,body,_,_=fetch(BASE+p);assert code==200,p
 if p=='robots.txt':assert b'Disallow: /\n' not in body and b'Sitemap: https://jowkaritech.com/sitemap.xml' in body
checks.append('robots discovery, Search Console verification and IndexNow key file remain reachable')
report={'passed':True,'checks':checks,'pages':pages,'scope':'Read-only production HTTP tests; indexing and rankings are not asserted.'}
(OUT/'results.json').write_text(json.dumps(report,indent=2))
for check in checks:print('PASS:',check,flush=True)
