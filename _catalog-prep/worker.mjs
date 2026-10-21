const POLICY="default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export default {async fetch(request,env){
 const url=new URL(request.url);let response;
 if(!['GET','HEAD'].includes(request.method))response=new Response('This pilot has no upload or submission endpoint.',{status:405,headers:{Allow:'GET, HEAD'}});
 else if(url.pathname==='/health')response=Response.json({ok:true,product:'catalog-prep',version:'0.1.0',processing:'browser-only',billing:false,store_connection:false});
 else {url.search='';response=await env.ASSETS.fetch(new Request(url,{method:request.method}));}
 const headers=new Headers(response.headers);
 headers.set('Content-Security-Policy',POLICY);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('X-Frame-Options','DENY');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');
 return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
}};
