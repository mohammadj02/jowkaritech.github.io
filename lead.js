/* Shared enquiry handling for homepage and existing SEO landing pages. */
(()=>{'use strict';
document.querySelectorAll('.leadForm').forEach((form,index)=>{
 const button=form.querySelector('button[type="submit"]'),status=form.querySelector('.formStatus');if(!button||!status)return;
 // Label legacy landing-page inputs without changing their submission field names.
 form.querySelectorAll('input:not([type=hidden]),textarea,select').forEach((input,n)=>{if(!input.id)input.id='lead-'+index+'-'+n;const label=input.closest('label')||input.previousElementSibling;if(label?.tagName==='LABEL')label.htmlFor=input.id;});
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 let sending=false,accepted=false;const original=button.innerHTML;
 form.addEventListener('input',()=>{if(accepted){accepted=false;button.disabled=false;button.innerHTML=original;}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending||accepted||!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form).entries());if(data.botcheck)return;
  if(!navigator.onLine){status.className='formStatus err';status.textContent='You appear to be offline. Your details are still here. Reconnect and try again, or email jowkaritech@gmail.com.';return;}
  sending=true;button.disabled=true;button.textContent='Sending your enquiry…';status.className='formStatus';status.textContent='';
  Object.assign(data,{access_key:'67b05f47-421b-41f8-837e-c8a12741dc9c',from_name:'JowkariTech Website',source_page:location.pathname});
  data.subject=(data.subject||'New JowkariTech website enquiry')+' — '+(data.business||data.name||'New enquiry');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data),signal:controller.signal});
   const result=await response.json().catch(()=>({}));if(!response.ok||!result.success)throw new Error('Not accepted');
   accepted=true;status.className='formStatus ok';status.textContent='Your enquiry was accepted by our form provider. Thank you — JowkariTech will review your request. No payment was taken.';form.reset();button.textContent='Enquiry accepted';
  }catch(error){status.className='formStatus err';status.textContent=error.name==='AbortError'?'We could not confirm delivery in time. Your details have been kept. Check for a confirmation before retrying, or email jowkaritech@gmail.com.':'Your enquiry could not be confirmed. Your details are still here. Try again or email jowkaritech@gmail.com.';button.disabled=false;button.innerHTML=original;}
  finally{clearTimeout(timeout);sending=false;}
 });
});
})();
