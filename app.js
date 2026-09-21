
document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());
const chat=document.getElementById("chat"),quick=document.querySelector(".quick");
const flows={
 quote:["I need a quote.","Of course. What service do you need help with?","Great — what name and phone number should the team use to follow up?"],
 hours:["What are your hours?","I can help with hours and availability. Would you like me to collect your details for a callback?","What name and phone number should the team use to contact you?"],
 book:["I'd like to book a service.","Absolutely. What service do you need and what day works best for you?","Perfect — I can collect your contact details for the booking request."]
};
function addBubble(text,who){if(!chat||!quick)return;const d=document.createElement("div");d.className="bubble "+who;d.textContent=text;chat.insertBefore(d,quick)}
document.querySelectorAll("[data-demo]").forEach(btn=>btn.addEventListener("click",()=>{const f=flows[btn.dataset.demo];if(!f)return;document.querySelectorAll("[data-demo]").forEach(b=>b.disabled=true);addBubble(f[0],"user");setTimeout(()=>addBubble(f[1],"bot"),350);setTimeout(()=>addBubble(f[2],"bot"),900)}));
const form=document.getElementById("lead-form");
if(form)form.addEventListener("submit",e=>{e.preventDefault();const d=new FormData(form);const subject="AI Receptionist inquiry - "+(d.get("business")||"New business");const body=["Business: "+(d.get("business")||""),"Name: "+(d.get("name")||""),"Email: "+(d.get("email")||""),"Phone: "+(d.get("phone")||""),"Business type: "+(d.get("type")||""),"Website: "+(d.get("website")||""),"","Customer questions / notes:",d.get("message")||"I'm interested in the C$79/month AI receptionist."].join("\n");location.href="mailto:JowkariTech@gmail.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body)});
