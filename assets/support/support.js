/* No advertising SDK, third-party tracking or credentials in this client. */
(()=>{'use strict';
const API='https://jowkari-support.jowkari-1mh.workers.dev';
const CHANNELS=['direct','google','bing','kijiji','nextdoor','facebook','linkedin','referral','website','other'];
const MEDIUMS=['direct','organic','social','referral','email','other'];
const PAGE=/^\/(?:$|(?:remote-it-support|computer-help-north-vancouver|password-recovery-help|business-it-support|request-support|support-pricing|support-resources|privacy|support-terms)\/(?:[a-z0-9-]+\/)?$|(?:services|about|contact)\.html$)/;
const safePage=path=>PAGE.test(path)?path:'/request-support/';
const q=new URLSearchParams(location.search);let attribution={utm_source:'direct',utm_medium:'direct',utm_campaign:'',source_page:safePage(location.pathname)};
try{const old=JSON.parse(sessionStorage.getItem('jowkariSupportSource')||'null');if(old&&Date.now()-old.time<1800000&&old.data){const d=old.data;attribution={utm_source:CHANNELS.includes(d.utm_source)?d.utm_source:'direct',utm_medium:MEDIUMS.includes(d.utm_medium)?d.utm_medium:'direct',utm_campaign:d.utm_campaign==='remote-it-launch'?'remote-it-launch':'',source_page:safePage(d.source_page||'')};}}catch{}
if(CHANNELS.includes(q.get('utm_source')))attribution.utm_source=q.get('utm_source');
if(MEDIUMS.includes(q.get('utm_medium')))attribution.utm_medium=q.get('utm_medium');
if(q.get('utm_campaign')==='remote-it-launch')attribution.utm_campaign='remote-it-launch';
function remember(){try{sessionStorage.setItem('jowkariSupportSource',JSON.stringify({time:Date.now(),data:attribution}));}catch{}}
if(location.pathname!=='/request-support/')attribution.source_page=safePage(location.pathname);remember();
function event(name){const data=Object.freeze({event:name,page:safePage(location.pathname),channel:attribution.utm_source});window.dispatchEvent(new CustomEvent('jowkari:conversion',{detail:data}));if(Array.isArray(window.dataLayer))window.dataLayer.push({...data});}
if(location.pathname==='/support-pricing/')event('support_pricing_view');
document.querySelectorAll('[data-it-menu]').forEach(button=>{const nav=document.getElementById(button.dataset.itMenu);if(!nav)return;const close=()=>{nav.classList.remove('open');button.setAttribute('aria-expanded','false');};button.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open));});nav.addEventListener('click',e=>{if(e.target.closest('a'))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){close();button.focus();}});});
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const href=a.getAttribute('href')||'';if(href.startsWith('/request-support/')){attribution.source_page=safePage(location.pathname);remember();event('support_request_click');}else if(href.startsWith('mailto:')||href.startsWith('tel:'))event('support_contact_click');});
const form=document.getElementById('supportRequest');if(!form)return;
const submit=form.querySelector('[type=submit]'),fields=document.getElementById('supportFields'),status=document.getElementById('supportStatus'),security=document.getElementById('supportSecurity'),refresh=document.getElementById('refreshSecurity'),issue=document.getElementById('supportIssue'),ownership=document.getElementById('ownershipRow'),owner=document.getElementById('ownerConfirmed');
let challenge='',expires=0,sending=false,finished=false,uncertain=false;
function ownershipState(){const needed=issue.value==='Account / login recovery';ownership.hidden=!needed;owner.required=needed;if(!needed)owner.checked=false;}
issue.addEventListener('change',ownershipState);ownershipState();
const preset=q.get('issue');if(['Account / login recovery','Business IT','Linux / server','Office / Outlook','Slow computer','Wi-Fi / networking'].includes(preset)){issue.value=preset;ownershipState();}
function show(text,state){status.textContent=text;status.dataset.state=state;status.hidden=false;status.focus({preventScroll:true});status.scrollIntoView({block:'nearest',behavior:'auto'});}
async function request(path,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),22000);try{const r=await fetch(API+path,{...options,mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal});let data;try{data=await r.json();}catch{throw new Error('unreadable');}return {r,data};}finally{clearTimeout(timer);}}
async function prepare(){if(sending||finished||uncertain)return;challenge='';submit.disabled=true;refresh.disabled=true;security.textContent='Preparing the form security check…';try{const {r,data}=await request('/v1/challenge');if(!r.ok||!data.ok||typeof data.token!=='string')throw new Error('unavailable');challenge=data.token;expires=data.expires_at;security.textContent='Security check ready. No remote connection is started by this form.';submit.disabled=false;}catch{security.textContent='The request service is unavailable. Your details stay on this page. Retry the security check or use the email link below.';}finally{refresh.disabled=false;}}
refresh.addEventListener('click',()=>prepare());prepare();
form.addEventListener('submit',async e=>{
 e.preventDefault();if(sending||finished||uncertain)return;ownershipState();
 form.querySelectorAll('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));
 if(!form.reportValidity())return;
 if(!navigator.onLine){show('You appear to be offline. Reconnect or use the email fallback. Your entered details have not been cleared.','error');return;}
 if(!challenge||Date.now()>expires){await prepare();show('The security check has been refreshed. Wait a moment, then press Send support request. Nothing has been sent yet.','error');return;}
 const values=Object.fromEntries(new FormData(form));
 const data={name:values.name.trim(),email:values.email.trim(),phone:values.phone.trim(),device:values.device,os:values.os,issue:values.issue,description:values.description.trim(),preferred_time:values.preferred_time.trim(),timezone:values.timezone,plan:values.plan,consent:form.querySelector('[name=consent]').checked,owner_confirmed:owner.checked,website_check:values.website_check||'',challenge,...attribution};
 if(/(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:password|passcode|verification code|recovery code|api[_ -]?key|access[_ -]?token)\s*[:=]\s*\S+)/i.test(data.description+'\n'+data.preferred_time)){show('Please remove passwords, verification codes, recovery codes and tokens. Describe only the problem.','error');document.getElementById('supportDescription').setAttribute('aria-invalid','true');return;}
 sending=true;fields.disabled=true;submit.disabled=true;form.setAttribute('aria-busy','true');show('Sending your support request securely…','loading');submit.textContent='Sending…';
 try{
  const {r,data:result}=await request('/v1/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(r.ok&&result.ok===true&&result.status==='provider_accepted'&&/^JT-[A-F0-9]{12}$/.test(result.reference||'')){
   finished=true;event('support_request_submitted');show('Request accepted by our email provider.\nReference: '+result.reference+'\n\nWe will review whether remote support is suitable and reply to agree the price and appointment. No session is booked and no payment has been taken.','success');submit.textContent='Request sent';form.reset();fields.hidden=true;refresh.hidden=true;security.textContent='You can quote the reference when contacting JowkariTech.';
  }else{
   const message=typeof result.message==='string'?result.message:'The request could not be confirmed. Please email us instead.';
   show(message+(result.reference?'\nReference: '+result.reference:''),'error');
   if(result.retrySafe===false){uncertain=true;submit.textContent='Please use the email fallback';refresh.hidden=true;security.textContent='To avoid a duplicate request, email us with the reference shown above. Your details have not been cleared.';}
   if(result.field&&typeof result.field==='string'){const target=Array.from(form.elements).find(el=>el.name===result.field);target?.setAttribute('aria-invalid','true');}
   if(result.code==='challenge_expired'){challenge='';expires=0;security.textContent='Refresh the security check below before trying again.';}
  }
 }catch{
  uncertain=true;show('We could not confirm delivery. Do not resubmit automatically: it may already have reached the email provider. Your details are still here. Email jowkaritech@gmail.com to check or arrange help.','error');submit.textContent='Please use the email fallback';refresh.hidden=true;
 }finally{sending=false;fields.disabled=false;form.removeAttribute('aria-busy');if(!finished&&!uncertain){submit.disabled=!challenge;submit.textContent='Send support request';}}
});
})();
