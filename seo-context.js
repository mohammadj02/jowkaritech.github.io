/* No analytics requests. Only approved campaign labels accompany a submitted enquiry. */
(()=>{'use strict';const query=new URLSearchParams(location.search);
if(location.pathname.startsWith('/jowkari-sites/')&&['preview_id','preview','review'].some(k=>query.has(k))){let m=document.querySelector('meta[name="robots"]');if(!m){m=document.createElement('meta');m.name='robots';document.head.append(m);}m.content='noindex,nofollow';}
const allowed=['utm_source','utm_medium','utm_campaign'];let labels={};
try{const old=JSON.parse(sessionStorage.getItem('jowkariCampaign')||'null');if(old&&Date.now()-old.ts<1800000)labels=old.labels||{};}catch{}
let fresh=false;for(const key of allowed){const value=query.get(key);if(value&&/^[a-zA-Z0-9_.~+ -]{1,80}$/.test(value)){labels[key]=value;fresh=true;}}
if(fresh){try{sessionStorage.setItem('jowkariCampaign',JSON.stringify({ts:Date.now(),labels}));}catch{}}
const setup=()=>{document.querySelectorAll('.leadForm').forEach((form,i)=>{form.querySelectorAll('input:not([type=hidden]),textarea,select').forEach((input,n)=>{if(!input.id)input.id='jowkari-field-'+i+'-'+n;const label=input.closest('label')||input.previousElementSibling;if(label?.tagName==='LABEL')label.htmlFor=input.id;});form.addEventListener('submit',()=>{for(const [key,value] of Object.entries(labels)){if(!allowed.includes(key)||typeof value!=='string'||!/^[a-zA-Z0-9_.~+ -]{1,80}$/.test(value))continue;let input=form.querySelector('input[name="'+key+'"]');if(!input){input=document.createElement('input');input.type='hidden';input.name=key;form.append(input);}input.value=value;}},true);});};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();})();
