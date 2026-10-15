// JowkariTech support intake. Never log bodies, credentials or email addresses.
// Request contents are transmitted to the existing owner-configured form provider only.
export const RELEASE = 'remote-it-20261015';
export const ORIGINS = new Set(['https://jowkaritech.com', 'https://www.jowkaritech.com']);
export const DEVICES = ['Laptop', 'Desktop', 'Server', 'Other / not sure'];
export const SYSTEMS = ['Windows 11', 'Other Windows version', 'Linux', 'Other / not sure'];
export const ISSUES = ['Slow computer', 'Windows / software error', 'Software installation', 'Office / Outlook', 'Wi-Fi / networking', 'Printer setup', 'Account / login recovery', 'Linux / server', 'Domain / DNS / HTTPS', 'Business IT', 'Other'];
export const PLANS = ['Basic — CAD 45 / up to 30 minutes', 'Extended — CAD 80 / up to 90 minutes', 'Recovery assistance — from CAD 45', 'Business / Linux / website — custom quote', 'Please advise'];
export const ZONES = ['America/Vancouver', 'America/Edmonton', 'America/Regina', 'America/Winnipeg', 'America/Toronto', 'America/Halifax', 'America/St_Johns', 'America/Whitehorse', 'Other — confirm by email'];
export const SOURCES = ['direct','google','bing','kijiji','nextdoor','facebook','linkedin','referral','website','other'];
const MEDIUMS = ['direct','organic','social','referral','email','other'];
const MAX_BODY = 12000, TTL = 86400;
const PAGE = /^\/(?:$|(?:remote-it-support|computer-help-north-vancouver|password-recovery-help|business-it-support|request-support|support-pricing|support-resources|privacy|support-terms)\/(?:[a-z0-9-]+\/)?$|(?:services|about|contact)\.html$)/;
const SAFE_ID = /^[a-f0-9]{32}$/;
const enc = new TextEncoder();
function fail(status,code,message,field,retrySafe=true){return Object.assign(new Error(message),{status,code,field,retrySafe});}
async function mac(secret,text){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function str(data,name,min,max){const raw=data[name];if(typeof raw!=='string'||raw.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw))throw fail(422,'validation','Please check this field.',name);const v=raw.trim();if(v.length<min)throw fail(422,'validation','Please complete this field.',name);return v;}
function choice(data,name,items){const v=str(data,name,1,100);if(!items.includes(v))throw fail(422,'validation','Choose one of the available options.',name);return v;}
export function validate(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw fail(400,'invalid_json','A support request must be a JSON object.');
 const keys=['name','email','phone','device','os','issue','description','preferred_time','timezone','plan','consent','owner_confirmed','website_check','challenge','source_page','utm_source','utm_medium','utm_campaign'];
 if(Object.keys(data).some(k=>!keys.includes(k)))throw fail(422,'unexpected_field','Remove unsupported fields. Never include passwords, tokens or recovery codes.');
 if(data.website_check)throw fail(400,'spam_check','This request could not be accepted. Please email us instead.');
 const p={name:str(data,'name',2,100),email:str(data,'email',5,254),phone:str(data,'phone',0,40),device:choice(data,'device',DEVICES),os:choice(data,'os',SYSTEMS),issue:choice(data,'issue',ISSUES),description:str(data,'description',15,2000),preferred_time:str(data,'preferred_time',3,160),timezone:choice(data,'timezone',ZONES),plan:choice(data,'plan',PLANS)};
 if(/[\r\n<>]/.test(p.name)||/[\r\n<>]/.test(p.preferred_time))throw fail(422,'validation','Use plain text without markup or newlines.','name');
 if(!/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(p.email))throw fail(422,'validation','Enter an email address where you can receive a reply.','email');
 if(p.phone&&!/^[+0-9 ()x.-]{7,40}$/.test(p.phone))throw fail(422,'validation','Enter a phone number or leave it blank.','phone');
 if(data.consent!==true)throw fail(422,'consent_required','Please consent to being contacted about this support request.','consent');
 if(p.issue==='Account / login recovery'&&data.owner_confirmed!==true)throw fail(422,'ownership_required','Recovery help is for the legitimate owner or an authorized administrator only.','owner_confirmed');
 const free=[p.description,p.preferred_time].join('\n');
 if(/(?:<\/?(?:script|iframe|img)\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:password|passcode|verification code|recovery code|api[_ -]?key|access[_ -]?token)\s*[:=]\s*\S+)/i.test(free))throw fail(422,'sensitive_content','Remove passwords, codes, tokens or markup. Describe the symptom only.','description');
 p.owner_confirmed=data.owner_confirmed===true;p.source_page=typeof data.source_page==='string'&&PAGE.test(data.source_page)?data.source_page:'/request-support/';
 p.utm_source=SOURCES.includes(data.utm_source)?data.utm_source:'direct';p.utm_medium=MEDIUMS.includes(data.utm_medium)?data.utm_medium:'direct';p.utm_campaign=data.utm_campaign==='remote-it-launch'?'remote-it-launch':'';
 return p;
}
async function readJSON(request){if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))throw fail(415,'content_type','Send this form as JSON.');const length=Number(request.headers.get('Content-Length')||0);if(length>MAX_BODY)throw fail(413,'too_large','The request is too large. Shorten the description.','description');const reader=request.body?.getReader();if(!reader)throw fail(400,'empty','The request was empty.');let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BODY){await reader.cancel();throw fail(413,'too_large','The request is too large. Shorten the description.','description');}chunks.push(value);}const bytes=new Uint8Array(size);let n=0;for(const c of chunks){bytes.set(c,n);n+=c.length;}try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw fail(400,'invalid_json','The request could not be read. Please reload and try again.');}}
function response(origin,body,status=200){const h={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Vary':'Origin'};if(ORIGINS.has(origin)){h['Access-Control-Allow-Origin']=origin;h['Access-Control-Allow-Methods']='GET, POST, OPTIONS';h['Access-Control-Allow-Headers']='Content-Type';}if(status===429)h['Retry-After']='60';return new Response(JSON.stringify(body),{status,headers:h});}
function ready(env){return !!(env.SUPPORT_FORM_KEY&&env.SUPPORT_CHALLENGE_SECRET&&env.SUPPORT_STATE&&env.SUPPORT_RATE&&env.CHALLENGE_RATE);}
function reference(nonce){return 'JT-'+nonce.slice(0,12).toUpperCase();}
export function makeHandler({upstream=fetch,now=()=>Date.now()}={}){return async function(request,env){
 const origin=request.headers.get('Origin')||'',url=new URL(request.url),reply=(b,s)=>response(origin,b,s);
 if(request.method==='OPTIONS')return new Response(null,{status:ORIGINS.has(origin)?204:403,headers:response(origin,{}).headers});
 if(url.pathname==='/health'&&request.method==='GET')return reply({ok:true,release:RELEASE,ready:ready(env),mode:'owner-email-notification',no_public_request_storage:true});
 if(!ORIGINS.has(origin))return reply({ok:false,code:'origin_not_allowed',message:'Use the support form on jowkaritech.com.'},403);
 if(!['/v1/challenge','/v1/requests'].includes(url.pathname))return reply({ok:false,code:'not_found'},404);
 if(!ready(env))return reply({ok:false,code:'not_configured',message:'The form is temporarily unavailable. Email jowkaritech@gmail.com. No request was sent.',retrySafe:true},503);
 let id='';
 try{
  const ip=request.headers.get('CF-Connecting-IP');if(!ip)throw fail(503,'network_identity','The request could not be validated. Use the email fallback.');
  const ipHash=await mac(env.SUPPORT_CHALLENGE_SECRET,'ip:'+ip);
  if(url.pathname==='/v1/challenge'){
   if(request.method!=='GET')return reply({ok:false,code:'method_not_allowed'},405);
   const rate=await env.CHALLENGE_RATE.limit({key:ipHash});if(!rate.success)throw fail(429,'rate_limit','Please wait a minute before trying again.');
   const nonce=crypto.randomUUID().replaceAll('-',''),issued=now(),text=nonce+'.'+issued+'.'+origin+'.'+ipHash;
   return reply({ok:true,token:nonce+'.'+issued+'.'+await mac(env.SUPPORT_CHALLENGE_SECRET,text),expires_at:issued+1800000});
  }
  if(request.method!=='POST')return reply({ok:false,code:'method_not_allowed'},405);
  const rate=await env.SUPPORT_RATE.limit({key:'ip:'+ipHash});if(!rate.success)throw fail(429,'rate_limit','Too many requests. Wait a minute or email jowkaritech@gmail.com.');
  const data=await readJSON(request),p=validate(data);
  if(typeof data.challenge!=='string'||data.challenge.length>150)throw fail(403,'challenge_expired','Refresh the form security check and submit again.');
  const [nonce,timestamp,signature,...extra]=data.challenge.split('.'),issued=Number(timestamp);
  if(extra.length||!SAFE_ID.test(nonce||'')||!Number.isSafeInteger(issued)||now()-issued<2000||now()-issued>1800000)throw fail(403,'challenge_expired','Refresh the form security check, wait a moment, then submit again.');
  const valid=await mac(env.SUPPORT_CHALLENGE_SECRET,nonce+'.'+timestamp+'.'+origin+'.'+ipHash);
  if(!equal(valid,signature))throw fail(403,'challenge_expired','Refresh the form security check and submit again.');
  id=reference(nonce);const key='it-support:receipt:'+nonce,fingerprint=await mac(env.SUPPORT_CHALLENGE_SECRET,JSON.stringify(p));
  const raw=await env.SUPPORT_STATE.get(key);let old;try{old=raw?JSON.parse(raw):null;}catch{throw fail(503,'receipt_unavailable','We cannot confirm an earlier submission. Email us with your reference.',null,false);}
  if(old){if(old.fingerprint!==fingerprint)throw fail(409,'request_changed','This reference has already been used. Email us to update it.',null,false);if(old.state==='accepted')return reply({ok:true,reference:id,duplicate:true,status:'provider_accepted',message:'Your earlier request was accepted. We have not sent it again.'});throw fail(409,'delivery_unknown','An earlier attempt may already have been sent. Email us with this reference rather than submitting again.',null,false);}
  const emailRate=await env.SUPPORT_RATE.limit({key:'email:'+await mac(env.SUPPORT_CHALLENGE_SECRET,p.email.toLowerCase())});if(!emailRate.success)throw fail(429,'rate_limit','Please wait a minute before another request.');
  // Only non-reversible fingerprint, state and time live in KV; never the contact fields.
  await env.SUPPORT_STATE.put(key,JSON.stringify({state:'pending',fingerprint,created:now()}),{expirationTtl:TTL});
  const payload={access_key:env.SUPPORT_FORM_KEY,from_name:'JowkariTech Remote IT Support',subject:'Remote IT support request ['+id+']',name:p.name,email:p.email,replyto:p.email,phone:p.phone||'Not supplied',device:p.device,operating_system:p.os,problem_type:p.issue,problem_description:p.description,preferred_appointment:p.preferred_time,timezone:p.timezone,support_option:p.plan,consent:'Yes — reply about this request only. Remote control requires separate attended-session consent.',ownership:p.owner_confirmed?'Customer confirms legitimate owner / authorized admin':'Not an account-recovery request',request_reference:id,source_page:p.source_page,utm_source:p.utm_source,utm_medium:p.utm_medium,utm_campaign:p.utm_campaign,terms:'Request only; no appointment, payment or guarantee of repair.'};
  let r,j;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{r=await upstream('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Origin':'https://jowkaritech.com'},body:JSON.stringify(payload),signal:controller.signal});j=await r.json().catch(()=>null);}catch{throw fail(503,'delivery_unknown','Delivery could not be confirmed. Your reference is below. Email us before retrying; the provider may have received it.',null,false);}finally{clearTimeout(timer);}
  if(!r.ok||j?.success!==true){await env.SUPPORT_STATE.put(key,JSON.stringify({state:'unconfirmed',fingerprint,created:now()}),{expirationTtl:TTL});throw fail(502,'provider_unconfirmed','The email provider did not confirm this request. Email jowkaritech@gmail.com and quote your reference.',null,false);}
  // A successful provider transmission is sufficient even if receipt persistence fails.
  await env.SUPPORT_STATE.put(key,JSON.stringify({state:'accepted',fingerprint,created:now()}),{expirationTtl:TTL}).catch(()=>{});
  return reply({ok:true,reference:id,status:'provider_accepted',message:'Your request was accepted by our email provider. We will review suitability and reply. Your appointment is not booked yet.'},201);
 }catch(err){const known=Number.isInteger(err.status);return reply({ok:false,code:known?err.code:'temporarily_unavailable',message:known?err.message:'We could not confirm this request. Email jowkaritech@gmail.com; no automatic retry will be made.',...(known&&err.field?{field:err.field}:{}),...(id?{reference:id}:{}),retrySafe:known?err.retrySafe:false},known?err.status:503);}
};}
export default {fetch:makeHandler()};
