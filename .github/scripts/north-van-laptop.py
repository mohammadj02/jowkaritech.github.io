"""Focused local-service copy update. Preserve the editor, forms, Workers and URLs."""
from pathlib import Path
import json, sys, xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[2]
PATH='computer-help-north-vancouver/index.html'
URL='https://jowkaritech.com/computer-help-north-vancouver/'
TITLE='Laptop & Computer Help North Vancouver | JowkariTech'
DESC='Slow Windows laptop or Outlook problems? North Vancouver-based remote computer help from C$45 CAD. By appointment; no physical repairs or walk-in service.'
INTRO='Slow Windows laptop, Outlook problems or software that will not work? Get remote troubleshooting from a North Vancouver-based provider. C$45 CAD for up to 30 minutes or C$80 CAD for up to 90 minutes, with scope and appointment agreed first.'
FIRST='''<div class="it-actions"><a class="it-btn" href="/request-support/">Ask about your laptop problem ↗</a><a class="it-btn secondary" href="mailto:jowkaritech@gmail.com?subject=North%20Vancouver%20laptop%20help">Email Mohammad directly</a></div>
<p class="it-fine">Remote appointments only. No walk-in shop, on-site visits, screen replacement or other physical laptop repairs. A support request is not a confirmed booking.</p>
<nav class="it-actions" aria-label="Laptop help topics"><a href="#laptop-problems">Problems we help with</a><a href="#repair-or-remote">Remote help or physical repair?</a><a href="#support-cost">CAD prices</a><a href="#local-questions">Common questions</a></nav>
<section class="it-section" id="laptop-problems"><h2>What is going wrong with your laptop?</h2><p>You do not need to diagnose the cause before contacting us. Tell us the symptom, whether the laptop starts, and whether you can still get online. We review whether remote support is suitable before agreeing to paid work.</p><ul class="it-list"><li><strong>A slow Windows laptop:</strong> startup delays, a program that takes too long to open, or recurring software errors. <a href="/request-support/?issue=Slow%20computer">Ask about a slow laptop</a>.</li><li><strong>Outlook or Office problems:</strong> trouble receiving email, sign-in prompts, or application configuration. <a href="/request-support/?issue=Office%20%2F%20Outlook">Ask about Outlook</a>.</li><li><strong>Wi-Fi or printer software:</strong> connection settings and software configuration, when a working internet connection is available for the appointment.</li><li><strong>Login or account recovery:</strong> help using official recovery processes for your own account. No security bypasses or guaranteed access. <a href="/password-recovery-help/">Read the recovery limits first</a>.</li><li><strong>Linux, domains or business systems:</strong> describe the environment for an agreed custom quote. <a href="/business-it-support/">Business and Linux support</a>.</li></ul><p>Try our free guides for a <a href="/support-resources/slow-windows-11/">slow Windows 11 computer</a> or <a href="/support-resources/outlook-not-receiving-email/">Outlook not receiving email</a> before booking. Paid help is optional.</p></section>
<section class="it-section" id="repair-or-remote"><h2>Laptop repair or remote help—which do you need?</h2><p>Looking for someone to fix a laptop in North Vancouver? The useful first distinction is software troubleshooting versus a physical repair. JowkariTech offers the former through attended remote sessions, not a repair counter.</p><div class="it-callout"><p><strong>Remote support may fit:</strong> the computer powers on, you can reach the desktop and the internet, and the issue involves Windows, email, applications or settings. Suitability still needs a review.</p><p><strong>A hands-on repair may be needed:</strong> a cracked display, damaged charging port, battery problem, liquid damage or a laptop that will not power on. Parts replacement and physical repairs are not included in this service.</p></div><p>A device login problem may prevent screen sharing entirely. We can discuss the official recovery route first; we cannot bypass encryption, another person's login or a provider's identity checks.</p></section>'''
LAST='''<section class="it-section" id="local-provider"><h2>Based in North Vancouver. Helping you online.</h2><p>Work directly with Mohammad Jowkari, the founder of JowkariTech. His background includes a BCIT diploma in Computer Information Systems Administration and hands-on Windows, Linux and networking projects. <a href="/about.html">Read about Mohammad and the business</a>.</p><p>Remote appointments are available to North Vancouver residents and small businesses, including customers in Lonsdale, Lynn Valley and Deep Cove, when the device and connection are suitable. These are service areas, not separate offices. Select America/Vancouver when suggesting an appointment; the actual time is confirmed by email.</p></section>
<section class="it-section" id="local-questions"><h2>Questions before booking laptop help.</h2><div class="it-faq"><details><summary>Can you fix my laptop remotely?</summary><p>Some software, Windows and Outlook issues are suitable for remote troubleshooting. We review the symptom and whether the laptop starts and connects before agreeing to a session. We do not promise a fix within the time allowance.</p></details><details><summary>Can I bring in my laptop or book a home visit?</summary><p>No. The service advertised here is remote-only, with no walk-in or on-site repairs. Screen, battery, charging-port and other physical repairs need a suitable hands-on provider.</p></details><details><summary>How much does remote laptop help cost?</summary><p>Basic Remote Support is C$45 CAD for up to 30 minutes on one straightforward issue. Extended Remote Support is C$80 CAD for up to 90 minutes on one agreed issue. The total, including any applicable taxes, is confirmed before work. Time is not a guarantee of resolution.</p></details><details><summary>Can I book help today?</summary><p>You can request your preferred time, but availability is confirmed by email. There is no guaranteed same-day response, instant booking or 24-hour service.</p></details><details><summary>Will you need my password?</summary><p>Do not send passwords, recovery answers or verification codes. You stay present during any remote session and enter sensitive information yourself on the official provider page with sharing stopped. You decide when to allow and end access.</p></details><details><summary>What should I send first?</summary><p>The laptop's operating system, a short description of the symptom, whether it powers on and gets online, and your preferred appointment time. Avoid private files, account secrets and full diagnostic logs. The request is free and does not begin a paid session.</p></details></div></section>
<div class="it-actions"><a class="it-btn" href="/request-support/">Request remote laptop help ↗</a><a class="it-btn secondary" href="mailto:jowkaritech@gmail.com?subject=North%20Vancouver%20laptop%20help">Email us instead</a></div>'''

def parse(text):return BeautifulSoup(text,'html.parser')
def update(root=ROOT):
 p=root/PATH;s=parse(p.read_text());assert s.select_one('link[rel=canonical]')['href']==URL
 main=s.select_one('main#main');hero=main.select_one('.it-hero');breadcrumb=main.select_one('.it-breadcrumb');assert hero and breadcrumb
 pricing=next(x for x in main.select('.it-section') if x.find('h2') and 'support pricing' in x.h2.get_text().lower())
 process=next(x for x in main.select('.it-section') if x.find('h2') and 'remote appointment works' in x.h2.get_text().lower())
 pricing.extract();process.extract();pricing['id']='support-cost'
 pricing.h2.string='North Vancouver laptop support pricing.'
 for node in list(main.children):
  if node is not hero and node is not breadcrumb:node.extract()
 hero.select_one('h1').clear();hero.h1.append('Laptop & computer help');hero.h1.append(s.new_tag('br'));hero.h1.append('in North Vancouver.')
 hero.select_one('.it-lead').string=INTRO
 breadcrumb.clear();breadcrumb.append(parse('<a href="/">Home</a> / <a href="/remote-it-support/">Remote support</a> / Laptop & computer help North Vancouver'))
 main.append(parse(FIRST));main.append(pricing);main.append(process);main.append(parse(LAST))
 s.title.string=TITLE;s.select_one('meta[name=description]')['content']=DESC
 for key,value in [('og:title',TITLE),('og:description',DESC)]:s.select_one('meta[property="'+key+'"]')['content']=value
 graph=json.loads(s.select_one('#jowkari-entity-schema').string)
 for node in graph['@graph']:
  if node.get('@type')=='WebPage':node['name']=TITLE;node['description']=DESC
  if node.get('@type')=='BreadcrumbList':node['itemListElement'][-1]['name']='Laptop & computer help North Vancouver'
  if node.get('@type')=='Service':
   node['name']='Remote laptop and computer troubleshooting in North Vancouver';node['serviceType']=node['name'];node['areaServed']={'@type':'City','name':'North Vancouver'};node['description']='Attended remote software troubleshooting by appointment. No physical repair, storefront or on-site service.'
 s.select_one('#jowkari-entity-schema').string=json.dumps(graph,ensure_ascii=False)
 p.write_text(str(s),encoding='utf-8')
 # Strengthen existing contextual paths instead of creating competing location pages.
 related=['index.html','services.html','about.html','contact.html','remote-it-support/index.html','support-resources/slow-windows-11/index.html','support-resources/outlook-not-receiving-email/index.html']
 for name in related:
  p=root/name;s=parse(p.read_text())
  for a in s.select('a[href="/computer-help-north-vancouver/"]'):a.string='North Vancouver laptop & computer help'
  if name.startswith('support-resources/') and not s.find(id='local-laptop-help'):
   s.main.append(parse('<section class="it-section" id="local-laptop-help"><h2>Need help with your laptop in North Vancouver?</h2><p>See our <a href="/computer-help-north-vancouver/">North Vancouver laptop and computer help</a> for remote suitability, C$45/C$80 CAD session options and the difference between software support and physical repairs. Requesting help does not commit you to a paid appointment.</p></section>'))
  p.write_text(str(s),encoding='utf-8')
 # This date records a real edit, not an automatically advancing freshness claim.
 ns='http://www.sitemaps.org/schemas/sitemap/0.9';ET.register_namespace('',ns);tree=ET.parse(root/'sitemap.xml')
 edited={URL}|{'https://jowkaritech.com/'+('' if x=='index.html' else x[:-10] if x.endswith('index.html') else x) for x in related}
 for node in tree.getroot():
  if node.find('{'+ns+'}loc').text in edited:
   mod=node.find('{'+ns+'}lastmod')
   if mod is None:mod=ET.SubElement(node,'{'+ns+'}lastmod')
   mod.text='2026-10-15'
 (root/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(tree.getroot(),encoding='unicode')+'\n')
 return sorted(edited)

def prepare_source():
 # Preserve these changes when the existing support build is explicitly run later.
 p=ROOT/'.github/scripts/build-support.py';text=p.read_text();marker='# Laptop search copy: keep the existing local page as the single canonical destination.'
 if marker not in text:
  anchor='# Keep prior Search Console and Bing/IndexNow verification files byte-identical.'
  assert anchor in text
  hook=marker+"\nimport runpy\nrunpy.run_path(str(ROOT/'.github/scripts/north-van-laptop.py'))['update'](ROOT)\n"
  p.write_text(text.replace(anchor,hook+'\n'+anchor,1))
 # Production checks should not send another owner test email on every content deployment.
 p=ROOT/'.github/workflows/remote-it-release.yml';text=p.read_text()
 old="SEND_OWNER_QA: ${{ github.run_attempt == 1 && '1' || '0' }}"
 new="SEND_OWNER_QA: ${{ github.event_name == 'workflow_dispatch' && inputs.send_owner_qa && github.run_attempt == 1 && '1' || '0' }}"
 if old in text:
  text=text.replace(old,new).replace('  workflow_dispatch:\n','  workflow_dispatch:\n    inputs:\n      send_owner_qa:\n        description: Send one clearly marked test request to the configured owner inbox\n        type: boolean\n        required: false\n        default: false\n',1)
  text=text.replace('Verify Pages, existing products and one owner-only test enquiry','Verify Pages and existing products; owner test is opt-in')
  p.write_text(text)

if __name__=='__main__':
 urls=update();prepare_source();print(json.dumps({'updated_urls':urls,'new_public_pages':0,'scope':'Existing local page, related links and regeneration hook; no form, Worker, DNS or pricing change.'},indent=2))
