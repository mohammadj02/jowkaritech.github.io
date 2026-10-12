import { normalize, MAX_BYTES, VERSION } from '../jowkari-sites/core.mjs';
const HOSTS = new Set(['https://jowkaritech.com', 'https://www.jowkaritech.com']);
const PREVIEW_MS = 30 * 60 * 1000, COOLDOWN_MS = 3 * 60 * 60 * 1000, HANDOFF_MS = 30 * 24 * 60 * 60 * 1000;
const ID = /^[a-f0-9]{32}$/i;
const TOKEN = /^[a-f0-9]{64}$/i;
async function digest(value) {return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function ipKey(env,request,kind) {
  const ip=request.headers.get('CF-Connecting-IP') || 'unknown';
  return 'studio-limit:'+kind+':'+await digest((env.PREVIEW_SIGNING_SECRET || 'jowkari-studio-v2')+':'+ip);
}
async function bodyJSON(request) {
  const reader=request.body?.getReader(); if(!reader)throw Object.assign(new Error('A JSON request body is required.'),{status:400});
  const chunks=[];let size=0;
  while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>MAX_BYTES+8192){await reader.cancel();throw Object.assign(new Error('Design is too large. Remove unused photos or export a ZIP.'),{status:413});}chunks.push(r.value);}
  const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(new Error('Invalid JSON. Please save and reopen your project.'),{status:400});}
}
function response(data,status,origin) {return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':HOSTS.has(origin)?origin:'https://jowkaritech.com','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});}
function publicRecord(id,record) {return {ok:true,id,kind:record.kind||'preview',design:record.design,expires_at:record.expires_at||record.expiresAt};}
export default {
  async fetch(request,env) {
    const origin=request.headers.get('Origin')||'',url=new URL(request.url),method=request.method;
    const json=(d,s=200)=>response(d,s,origin);
    if(method==='OPTIONS')return new Response(null,{status:HOSTS.has(origin)?204:403,headers:{'Access-Control-Allow-Origin':HOSTS.has(origin)?origin:'https://jowkaritech.com','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept','Vary':'Origin'}});
    if(method==='GET'&&['/','/health'].includes(url.pathname))return json({ok:true,service:'jowkari-preview',version:VERSION,storage_ready:Boolean(env.PREVIEW_KV),max_design_bytes:MAX_BYTES});
    if(!env.PREVIEW_KV)return json({error:'storage_unavailable',message:'Preview storage is not configured. Your design can still be exported as a ZIP.'},503);
    try {
      if(method==='GET'&&url.pathname.startsWith('/preview/')){
        const id=url.pathname.slice('/preview/'.length);if(!ID.test(id))return json({error:'invalid_id',message:'This preview link is invalid. Ask for a new link.'},400);
        const raw=await env.PREVIEW_KV.get('preview:'+id);if(!raw)return json({error:'expired_or_missing'},410);
        const record=JSON.parse(raw),expires=record.expires_at||record.expiresAt;
        if(!expires||expires<=Date.now())return json({error:'expired_or_missing'},410);
        return json(publicRecord(id,record));
      }
      if(!HOSTS.has(origin))return json({error:'origin_not_allowed'},403);
      if(method==='DELETE'&&url.pathname.startsWith('/v2/previews/')){
        const id=url.pathname.slice('/v2/previews/'.length);if(!ID.test(id))return json({error:'invalid_id'},400);
        const data=await bodyJSON(request),raw=await env.PREVIEW_KV.get('preview:'+id);
        if(!raw)return json({ok:true,removed:true});const record=JSON.parse(raw);
        if(!TOKEN.test(data?.manage_token||'')||await digest(data.manage_token)!==record.manage_hash)return json({error:'unauthorized',message:'The edit key for this preview is missing. Your draft was not changed.'},401);
        await env.PREVIEW_KV.delete('preview:'+id);return json({ok:true,removed:true});
      }
      if(method!=='POST'||!['/v2/previews','/v2/handoffs','/preview/start'].includes(url.pathname))return json({error:'not_found'},404);
      const data=await bodyJSON(request);let design;
      try{design=normalize(data?.design);}catch(err){return json({error:'invalid_design',message:err.message},/4 MB/.test(err.message)?413:400);}
      const now=Date.now(),handoff=url.pathname==='/v2/handoffs',kind=handoff?'handoff':'preview';
      if(!handoff&&data.id){
        if(!ID.test(data.id))return json({error:'invalid_id'},400);const raw=await env.PREVIEW_KV.get('preview:'+data.id);
        if(!raw)return json({error:'expired_or_missing'},410);const record=JSON.parse(raw);
        if(record.kind!=='preview'||!TOKEN.test(data.manage_token||'')||await digest(data.manage_token)!==record.manage_hash)return json({error:'unauthorized',message:'This preview cannot be updated without its original edit key.'},401);
        if(record.expires_at<=now)return json({error:'expired_or_missing'},410);
        record.design=design;await env.PREVIEW_KV.put('preview:'+data.id,JSON.stringify(record),{expirationTtl:Math.max(60,Math.ceil((record.expires_at-now)/1000))});
        return json({ok:true,id:data.id,manage_token:data.manage_token,expires_at:record.expires_at,preview_url:'https://jowkaritech.com/jowkari-sites/?preview_id='+data.id});
      }
      const limit=await ipKey(env,request,kind),next=Number(await env.PREVIEW_KV.get(limit)||0);
      if(next>now)return json({error:'cooldown',message:handoff?'Please wait a minute before creating another design review.':'A new free preview is available after the 3-hour cooldown. Update your active preview or download a ZIP instead.',next_allowed_at:next,retry_after_ms:next-now},429);
      const id=crypto.randomUUID().replaceAll('-',''),token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
      const ttl=handoff?HANDOFF_MS:PREVIEW_MS,expires=now+ttl,record={kind,design,expires_at:expires,manage_hash:await digest(token)};
      await env.PREVIEW_KV.put('preview:'+id,JSON.stringify(record),{expirationTtl:Math.ceil(ttl/1000)});
      await env.PREVIEW_KV.put(limit,String(now+(handoff?60000:COOLDOWN_MS)),{expirationTtl:handoff?60:10800});
      return json({ok:true,id,manage_token:token,kind,expires_at:expires,next_allowed_at:now+(handoff?60000:COOLDOWN_MS),preview_url:'https://jowkaritech.com/jowkari-sites/?preview_id='+id});
    }catch(err){console.error('Preview service failure:',err.name);return json({error:'preview_error',message:err.status?err.message:'The preview service could not save or load this design. Your local draft is unchanged; try again or export a ZIP.'},err.status||503);}
  }
};
