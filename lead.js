(function(){
  document.querySelectorAll('.leadForm').forEach(function(form){
    form.addEventListener('submit',async function(e){
      e.preventDefault();
      var btn=form.querySelector('button[type="submit"]'),status=form.querySelector('.formStatus'),old=btn.textContent;
      btn.disabled=true;btn.textContent='Sending...';status.className='formStatus';status.textContent='';
      var data=Object.fromEntries(new FormData(form).entries());
      data.access_key='67b05f47-421b-41f8-837e-c8a12741dc9c';
      data.from_name='JowkariTech Website';
      data.subject=(data.subject||'New JowkariTech website lead')+' — '+(data.business||data.name||'New lead');
      data.source_page=location.pathname;
      if(data.botcheck){btn.disabled=false;btn.textContent=old;return;}
      try{
        var r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)});
        var j=await r.json().catch(function(){return{}});
        if(!r.ok||!j.success)throw new Error(j.message||'Submission failed');
        status.className='formStatus ok';status.textContent='Got it. JowkariTech received your request.';
        form.reset();btn.textContent='Sent ✓';
      }catch(err){
        status.className='formStatus err';status.textContent='Could not send right now. Email jowkaritech@gmail.com instead.';
        btn.disabled=false;btn.textContent=old;
      }
    });
  });
})();