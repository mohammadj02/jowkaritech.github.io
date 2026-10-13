// Jowkari Sites Studio. Pure model/rendering helpers shared by the editor and tests.
export const VERSION = 'studio-2026.10.12';
export const MAX_BYTES = 4 * 1024 * 1024;
export const INDUSTRIES = `Roofing Contractor|Plumber|Electrician|HVAC Contractor|Heat Pump Installer|Solar Installer|General Contractor|Home Builder|Renovation Contractor|Kitchen Renovation|Bathroom Renovation|Basement Renovation|Carpenter|Handyman|Painter|Drywall Contractor|Insulation Contractor|Flooring Contractor|Tile Installer|Cabinet Maker|Countertop Installer|Window Installer|Door Installer|Garage Door Service|Glass Company|Fencing Contractor|Deck Builder|Concrete Contractor|Masonry Contractor|Excavation Contractor|Demolition Contractor|Waterproofing|Restoration Company|Mold Removal|Fireplace Service|Chimney Service|Septic Service|Drainage Contractor|Welder|Metal Fabrication|Scaffolding|Commercial Contractor|Landscaper|Landscape Designer|Lawn Care|Tree Service|Arborist|Garden Maintenance|Irrigation Service|Snow Removal|Pressure Washing|Window Cleaning|Gutter Cleaning|House Cleaning|Commercial Cleaning|Carpet Cleaning|Junk Removal|Moving Company|Pest Control|Pool Service|Hot Tub Service|Auto Detailing|Auto Repair|Mechanic|Tire Shop|Towing Company|Car Wash|Auto Glass|Body Shop|Mobile Mechanic|Motorcycle Repair|Dentist|Dental Clinic|Orthodontist|Chiropractor|Physiotherapist|Massage Therapist|Counsellor|Psychologist|Medical Clinic|Walk-In Clinic|Optometrist|Pharmacy|Veterinary Clinic|Naturopath|Nutritionist|Podiatrist|Speech Therapist|Occupational Therapist|Hair Salon|Barbershop|Nail Salon|Spa|Med Spa|Tattoo Studio|Beauty Studio|Makeup Artist|Personal Trainer|Gym|Yoga Studio|Pilates Studio|Martial Arts|Dance Studio|Sports Coach|Restaurant|Cafe|Bakery|Catering Company|Food Truck|Meal Prep|Private Chef|Ice Cream Shop|Coffee Roaster|Photographer|Videographer|Wedding Planner|Event Planner|Florist|DJ|Photo Booth Rental|Party Rental|Event Venue|Law Firm|Accountant|Bookkeeper|Mortgage Broker|Real Estate Agent|Property Manager|Insurance Broker|Financial Advisor|Consultant|Marketing Agency|Web Design Agency|IT Support|Cybersecurity Company|Managed IT|Computer Repair|Recruiting Agency|Business Coach|Notary|Immigration Consultant|Tutor|Daycare|Preschool|Music Teacher|Driving School|Language School|Training Company|After School Program|Security Company|Courier|Delivery Service|Print Shop|Sign Company|Interior Designer|Architect|Home Inspector|Engineering Consultant|Surveyor|Dog Groomer|Dog Walker|Pet Sitter|Dog Trainer|Pet Boarding|Travel Agency|Tour Company|Hotel|Bed and Breakfast|Vacation Rental Manager|Laundry Service|Dry Cleaner|Tailor|Alterations|Storage Company`.split('|');
export const THEMES = {
  bold: { label: 'North Shore', accent: '#c7400b', dark: '#17212b', paper: '#ffffff' },
  clean: { label: 'Clean studio', accent: '#202c38', dark: '#16202a', paper: '#ffffff' },
  blue: { label: 'Coastal blue', accent: '#12659a', dark: '#102c40', paper: '#ffffff' },
  natural: { label: 'Evergreen', accent: '#17694e', dark: '#173027', paper: '#fbfcf8' },
  premium: { label: 'Warm editorial', accent: '#905226', dark: '#2e251d', paper: '#fffdf7' },
  dark: { label: 'After hours', accent: '#b6360b', dark: '#111821', paper: '#ffffff' }
};
export const BLOCKS = { hero: 'Hero', services: 'Services', about: 'About', gallery: 'Gallery', text: 'Text', image: 'Image', faq: 'Questions', reviews: 'Real reviews', cta: 'Call to action', contact: 'Contact' };
export const clean = (x, max = 4000) => typeof x === 'string' ? x.slice(0, max) : '';
export const escapeHTML = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clone = x => JSON.parse(JSON.stringify(x));
export const uid = () => 's' + crypto.randomUUID().replaceAll('-', '').slice(0, 15);
export const slug = x => clean(x).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
export function safeImage(x) {
  if (typeof x !== 'string') return '';
  if (x.length > MAX_BYTES) throw new Error('An image exceeds the 4 MB project limit. Your original draft is unchanged; resize it before importing.');
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(x)) return x;
  try { const u = new URL(x); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
export function safeLink(x) {
  x = clean(x, 2000).trim();
  if (/^#[a-z0-9_-]+$/i.test(x)) return x;
  if (/^tel:\+?[0-9 ()-]{5,30}$/.test(x)) return x;
  if (/^mailto:[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9.-]+$/i.test(x)) return x;
  try { const u = new URL(x); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
export const safeColor = (x, fallback = '#ffffff') => /^#[0-9a-f]{6}$/i.test(x || '') ? x : fallback;
const scalar = (x, low, high, fallback) => Number.isFinite(Number(x)) ? Math.max(low, Math.min(high, Number(x))) : fallback;
export function normalize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !input.pages || typeof input.pages !== 'object') throw new Error('Choose a JowkariTech project JSON file.');
  const pairs = Object.entries(input.pages).filter(([k, v]) => !['__proto__', 'constructor', 'prototype'].includes(k) && Array.isArray(v));
  if(pairs.length>12)throw new Error('This editor supports up to 12 pages. No pages were removed; export a backup before simplifying the project.');
  if(pairs.some(([,v])=>v.length>50))throw new Error('A page can contain up to 50 sections. No sections were removed.');
  if (!pairs.length) throw new Error('This project has no pages.');
  const pages = Object.create(null), ids = new Set();
  for (const [key, list] of pairs) {
    const title = clean(key, 60).trim(); if (!title) continue;
    pages[title] = list.slice(0, 50).filter(s => s && Object.hasOwn(BLOCKS, s.type)).map(s => {
      let id = /^[a-z0-9_-]{1,60}$/i.test(s.id || '') ? s.id : uid(); if (ids.has(id)) id = uid(); ids.add(id);
      const image = safeImage(s.image);
      return { id, type: s.type, title: clean(s.title, 240), body: clean(s.body, 6000), kicker: clean(s.kicker, 100),
        image, alt: clean(s.alt, 200), images: Array.isArray(s.images) ? s.images.slice(0, 12).map(safeImage) : [],
        items: Array.isArray(s.items) ? s.items.slice(0, 12).map(t => clean(t, 300)) : [],
        itemDescriptions: Array.isArray(s.itemDescriptions) ? s.itemDescriptions.slice(0, 12).map(t => clean(t, 1000)) : [],
        link: safeLink(s.link), button: clean(s.button, 100), background: safeColor(s.background, ''),
        padding: scalar(s.padding, 24, 130, 68), radius: scalar(s.radius, 0, 40, 18),
        fit: s.fit === 'contain' ? 'contain' : 'cover', position: scalar(s.position, 0, 100, 50),
        layout: ['split', 'reverse', 'wide', 'center'].includes(s.layout) ? s.layout : 'split', hidden: s.hidden === true };
    });
  }
  if (!Object.keys(pages).length) throw new Error('This project has no valid pages.');
  const p = { version: VERSION, name: clean(input.name, 120) || 'My business', industry: clean(input.industry, 120),
    city: clean(input.city, 180), phone: clean(input.phone, 60), email: clean(input.email, 160), logo: safeImage(input.logo),
    cta: clean(input.cta, 100) || 'Request a quote', style: Object.hasOwn(THEMES, input.style) ? input.style : 'bold',
    accent: safeColor(input.accent, ''), font: ['Inter','Georgia','Bricolage Grotesque'].includes(input.font) ? input.font : 'Inter',
    page: Object.hasOwn(pages, input.page) ? input.page : Object.keys(pages)[0], pages,
    media: Array.isArray(input.media) ? input.media.slice(0, 30).map(safeImage).filter(Boolean) : [] };
  if (new TextEncoder().encode(JSON.stringify(p)).length > MAX_BYTES) throw new Error('Project is larger than 4 MB. Remove unused photos or upload smaller images.');
  return p;
}
export function defaults(industry) {
  const i = industry.toLowerCase();
  if (/roof/.test(i)) return ['Roof repairs', 'Roof replacement', 'Roof inspections'];
  if (/plumb|drain/.test(i)) return ['Leak repair', 'Drain service', 'Fixture installation'];
  if (/electric/.test(i)) return ['Electrical repairs', 'Panel upgrades', 'EV charger installation'];
  if (/barber|hair/.test(i)) return ['Haircuts', 'Styling', 'Consultations'];
  if (/clean/.test(i)) return ['Home cleaning', 'Deep cleaning', 'Move-out cleaning'];
  if (/restaurant|cafe/.test(i)) return ['Dine-in', 'Takeout', 'Special occasions'];
  return ['Our services', 'Consultations', 'Project support'];
}
export function makeBlock(type, p) {
  const common = { id: uid(), type, title: BLOCKS[type], body: '', kicker: '', image: '', alt: '', images: [], items: [], itemDescriptions: [], button: '', link: '', layout: 'split', padding: 68, radius: 18, position: 50, fit: 'cover', hidden: false, background: '' };
  const content = {
    hero: { title: `${p.industry || 'Local services'}, made simple.`, body: `Tell us what you need. ${p.name} serves ${p.city || 'our local community'}.`, kicker: p.city },
    services: { title: 'How we can help', body: 'Explore our services and get in touch to discuss your project.', items: defaults(p.industry || '') },
    about: { title: `A little about ${p.name}`, body: 'Add your real story: what you do, how you work, and what your customers can expect.' },
    gallery: { title: 'A closer look at our work', body: 'Upload your own project photos using the image controls.' },
    text: { title: 'Make space for your story', body: 'Click this text to write in your own words.' },
    image: { title: 'Show the details', body: 'Add a photo and a short caption.' },
    faq: { title: 'Good questions. Clear answers.', items: ['Which areas do you serve?', 'How do I request a quote?'], itemDescriptions: [p.city || 'Add your service area.', 'Contact us with the details of your project.'] },
    reviews: { title: 'What our customers say', body: 'Add genuine feedback you have permission to publish. No reviews have been added yet.' },
    cta: { title: 'Let’s talk about your project.', body: 'Tell us what you have in mind and we will discuss the next step.' },
    contact: { title: 'Get in touch', body: 'Call, email, or prepare an enquiry below.' }
  };
  return { ...common, ...content[type] };
}
export function starter(info) {
  const p = { ...info, style: 'bold', font: 'Inter', cta: 'Request a quote', page: 'Home', media: [], pages: {} };
  p.pages.Home = ['hero','services','about','cta','contact'].map(t => makeBlock(t, p));
  if (info.services?.length) p.pages.Home[1].items = info.services;
  return normalize(p);
}
export function reorder(list, source, target, after = false) {
  const from = list.findIndex(s => s.id === source), dest = list.findIndex(s => s.id === target);
  if (from < 0 || dest < 0 || from === dest) return list;
  const next = list.slice(), [item] = next.splice(from, 1);
  next.splice(next.findIndex(s => s.id === target) + (after ? 1 : 0), 0, item); return next;
}
export function siteHTML(project, options = {}) {
  const p = normalize(project), e = escapeHTML, theme = THEMES[p.style], editable = !!options.editable;
  const accent = safeColor(p.accent, theme.accent), pages = Object.keys(p.pages), font = p.font === 'Georgia' ? 'Georgia,serif' : 'system-ui,-apple-system,Segoe UI,sans-serif';
  const buttonLink = /^call/i.test(p.cta) && safeLink('tel:' + p.phone) ? safeLink('tel:' + p.phone) : '#contact';
  function text(tag, val, field, s) { return `<${tag}${editable ? ` contenteditable="true" spellcheck="true" data-field="${field}" data-id="${e(s.id)}"` : ''}>${e(val)}</${tag}>`; }
  function image(src, alt, s, slot = 'image') { const u = safeImage(src); return u ? `<img data-image-slot="${e(slot)}" src="${e(u)}" alt="${e(alt || s.title)}" loading="${s.type==='hero'?'eager':'lazy'}" style="object-fit:${s.fit};object-position:50% ${s.position}%;border-radius:${s.radius}px">` : (editable ? `<div class="photoEmpty" data-image-slot="${e(slot)}">＋ Add a photo</div>` : ''); }
  function button(s) { const link = safeLink(s.link) || buttonLink; return `<a class="siteButton" href="${e(link)}"${/^https?:/.test(link) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${e(s.button || p.cta)} <span aria-hidden="true">↗</span></a>`; }
  function section(s) {
    if (s.hidden && !editable) return '';
    const heading = text(s.type === 'hero' ? 'h1' : 'h2', s.title, 'title', s);
    const description = text('p', s.body, 'body', s), kicker = s.kicker ? `<div class="kicker">${e(s.kicker)}</div>` : '';
    let content = heading + description;
    if (['hero','about'].includes(s.type)) content = `<div class="split ${s.layout}"><div>${kicker}${heading}${description}${s.type === 'hero' ? button(s) : ''}</div>${image(s.image, s.alt, s)}</div>`;
    if (s.type === 'image') content += image(s.image, s.alt, s);
    if (s.type === 'services') content += `<div class="cards">${s.items.map((item,i) => `<article class="card">${image(s.images[i], item, s, 'images:' + i)}<h3>${e(item)}</h3><p>${e(s.itemDescriptions[i] || '')}</p></article>`).join('')}</div>`;
    if (s.type === 'gallery') content += `<div class="gallery">${Array.from({length: Math.max(editable ? 3 : 0, s.images.length)}, (_,i) => image(s.images[i], s.alt || s.title, s, 'images:' + i)).join('')}</div>`;
    if (s.type === 'faq') content += s.items.map((q,i) => `<details><summary>${e(q)}</summary><p>${e(s.itemDescriptions[i] || 'Contact us for details.')}</p></details>`).join('');
    if (s.type === 'reviews' && s.items.length) content += `<div class="cards">${s.items.map((q,i) => `<blockquote class="card"><p>${e(q)}</p><footer>${e(s.itemDescriptions[i] || '')}</footer></blockquote>`).join('')}</div>`;
    if (s.type === 'cta') content = `<div class="cta">${heading}${description}${button(s)}</div>`;
    if (s.type === 'contact') {
      const tel = safeLink('tel:' + p.phone), mail = safeLink('mailto:' + p.email);
      content += `<div class="contactLinks">${tel ? `<a href="${e(tel)}">${e(p.phone)}</a>` : ''}${mail ? `<a href="${e(mail)}">${e(p.email)}</a>` : ''}<span>${e(p.city)}</span></div>`;
      if (mail) content += `<form class="contactForm" data-recipient="${e(p.email)}"><label>Your name<input name="name" autocomplete="name" required></label><label>Your email<input name="email" type="email" autocomplete="email" required></label><label class="full">How can we help?<textarea name="message" required></textarea></label><button class="siteButton" type="submit">Prepare email enquiry ↗</button><small>Opens your email app with your message. This form does not send automatically.</small></form>`;
    }
    const tools = editable ? `<div class="tools"><button type="button" class="drag" draggable="true" data-action="drag" aria-label="Drag section">⠿ ${e(BLOCKS[s.type])}</button><button data-action="up" aria-label="Move section up">↑</button><button data-action="down" aria-label="Move section down">↓</button><button data-action="duplicate" aria-label="Duplicate section">Duplicate</button><button data-action="remove" aria-label="Delete section">×</button></div>` : '';
    return `<section class="section${editable ? ' editable' : ''}${s.hidden ? ' dim' : ''}" data-section="${e(s.id)}" data-kind="${s.type}" style="padding:${s.padding}px 0;${s.background ? 'background:' + s.background : ''}">${tools}<div class="wrap">${content}</div></section>`;
  }
  const rules = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${theme.paper};color:${theme.dark};font-family:${font};line-height:1.6}a{color:inherit}button,input,textarea{font:inherit}button,a{touch-action:manipulation}button{cursor:pointer}header{border-bottom:1px solid #e4e5e7;background:${theme.paper}}.wrap{width:min(1080px,calc(100% - 48px));margin:auto}.nav{min-height:80px;display:flex;justify-content:space-between;align-items:center;gap:22px;flex-wrap:wrap;padding-top:14px;padding-bottom:14px}.brand{font-size:20px;font-weight:800;text-decoration:none}.brand img{height:44px;max-width:180px;object-fit:contain}nav{display:flex;align-items:center;flex-wrap:wrap;gap:22px}nav a{text-decoration:none;font-size:14px}.siteButton{display:inline-flex;align-items:center;gap:18px;text-decoration:none;border:0;background:${accent};color:white;padding:13px 22px;border-radius:8px;font-weight:700;margin-top:10px}.kicker{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:${accent};font-weight:700}h1,h2,h3{line-height:1.12;letter-spacing:-.035em}h1{font-size:clamp(38px,5.2vw,66px);margin:16px 0 22px}h2{font-size:clamp(28px,3.7vw,44px);margin:8px 0 18px}h3{font-size:22px}p{white-space:pre-line;color:#53606b;margin:14px 0 22px}img{width:100%;max-height:620px;display:block;object-fit:cover}.split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}.split img{height:390px}.split.reverse>img,.split.reverse>.photoEmpty{order:-1}.split.wide,.split.center{grid-template-columns:1fr}.split.center{text-align:center}.photoEmpty{min-height:230px;border:1px dashed #bdc5c7;border-radius:18px;background:linear-gradient(145deg,#f1eee5,#e9efed);display:grid;place-items:center;color:#67706d;cursor:pointer}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:28px}.card{margin:0;border:1px solid #dfe3e5;border-radius:14px;padding:22px}.card img{height:160px}.card .photoEmpty{min-height:130px}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.gallery img{height:240px}.cta{background:${theme.dark};color:#fff;border-radius:20px;padding:42px}.cta p{color:#dbe0e4}details{border-bottom:1px solid #dfe3e5;padding:18px 0}summary{cursor:pointer;font-weight:700}.contactLinks{display:flex;flex-wrap:wrap;gap:24px}.contactForm{display:grid;grid-template-columns:1fr 1fr;gap:18px;max-width:700px;margin-top:30px}label{font-size:13px;display:grid;gap:8px}input,textarea{width:100%;border:1px solid #cbd2d6;border-radius:8px;padding:12px;background:#fff;color:#17212b}textarea{min-height:120px}.full,.contactForm small{grid-column:1/-1}.contactForm small{color:#68747a}.footer{border-top:1px solid #dfe3e5;padding:32px 0;margin-top:20px;font-size:14px}.section{position:relative}.page[hidden]{display:none!important}.tools{display:flex;gap:5px;position:absolute;z-index:5;top:8px;left:12px;opacity:0}.tools button{font:12px system-ui;background:#17212b;color:white;border:0;border-radius:5px;padding:7px 10px}.editable{outline:1px solid transparent;outline-offset:-1px}.editable:hover,.editable.selected{outline-color:${accent}}.editable:hover>.tools,.editable.selected>.tools{opacity:1}.drag{cursor:grab}[contenteditable]:focus{outline:2px solid ${accent};outline-offset:5px}.dim{opacity:.4}.dropTarget{outline:3px dashed ${accent}!important}.imgError{display:block;min-height:100px;background:#f6eee7;color:#735744}body.editing a{cursor:pointer}:focus-visible{outline:3px solid ${accent};outline-offset:3px}@media(max-width:680px){.wrap{width:calc(100% - 32px)}.split,.cards{grid-template-columns:1fr;gap:24px}.split img{height:270px}.gallery{grid-template-columns:1fr 1fr}.gallery img{height:180px}.nav{gap:15px}nav{gap:14px}.section{padding:38px 0!important}.cta{padding:26px}.contactForm{grid-template-columns:1fr}.tools{opacity:1;position:relative;top:auto;left:auto;margin:0 16px 18px;flex-wrap:wrap}.contactLinks{flex-direction:column;gap:10px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}`;
  const runtime = function(edit) {
    const send = d => { if (edit && window.parent !== window) parent.postMessage({type:'jowkari-studio',...d}, '*'); };
    const switchPage = key => { document.querySelectorAll('.page').forEach(p => {p.hidden = p.dataset.page !== key;}); if(edit)send({action:'page',page:key}); };
    function navigate(hash) {
      if(hash === '#contact') {const contact = document.querySelector('.page:not([hidden]) [data-kind="contact"]') || document.querySelector('[data-kind="contact"]'); if(contact){switchPage(contact.closest('.page').dataset.page); contact.scrollIntoView({behavior:'smooth'});} return;}
      const page = [...document.querySelectorAll('.page')].find(p => p.dataset.anchor === hash.slice(1)); if(page){switchPage(page.dataset.page);window.scrollTo(0,0);}
    }
    document.addEventListener('click', ev => {
      const sec=ev.target.closest('[data-section]'), action=ev.target.closest('[data-action]'), anchor=ev.target.closest('a');
      if(edit && sec){send({action:action?.dataset.action || 'select',id:sec.dataset.section,slot:ev.target.closest('[data-image-slot]')?.dataset.imageSlot}); document.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'));sec.classList.add('selected');}
      if(anchor){const href=anchor.getAttribute('href');if(href?.startsWith('#')){ev.preventDefault();navigate(href);}else if(edit){ev.preventDefault();send({action:'link-hint'});}}
    });
    if(edit){
      document.addEventListener('focusout', ev => {const el=ev.target.closest('[data-field]');if(el)send({action:'edit',id:el.dataset.id,field:el.dataset.field,value:el.textContent});});
      document.addEventListener('paste', ev=>{if(ev.target.closest('[contenteditable]')){ev.preventDefault();document.execCommand('insertText',false,ev.clipboardData.getData('text/plain'));}});
      document.addEventListener('dragstart', ev=>{const h=ev.target.closest('.drag');if(!h)return;ev.dataTransfer.setData('application/x-jowkari',JSON.stringify({id:h.closest('[data-section]').dataset.section}));ev.dataTransfer.effectAllowed='move';});
      document.addEventListener('dragover',ev=>{const s=ev.target.closest('[data-section]');if(s&&[...ev.dataTransfer.types].includes('application/x-jowkari')){ev.preventDefault();s.classList.add('dropTarget');}});
      document.addEventListener('dragleave',ev=>ev.target.closest('[data-section]')?.classList.remove('dropTarget'));
      document.addEventListener('drop',ev=>{const s=ev.target.closest('[data-section]');document.querySelectorAll('.dropTarget').forEach(x=>x.classList.remove('dropTarget'));if(!s)return;try{const d=JSON.parse(ev.dataTransfer.getData('application/x-jowkari'));ev.preventDefault();send({action:'drop',id:d.id,block:d.block,target:s.dataset.section});}catch{}});
      window.addEventListener('message',ev=>{if(ev.source!==parent||ev.data?.type!=='jowkari-parent')return;if(ev.data.action==='restore'){window.scrollTo(0,Number(ev.data.y)||0);}if(ev.data.action==='select'||ev.data.action==='restore'){document.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'));const s=[...document.querySelectorAll('[data-section]')].find(x=>x.dataset.section===ev.data.id);s?.classList.add('selected');if(ev.data.scroll)s?.scrollIntoView({block:'center',behavior:'smooth'});}});
    }
    document.addEventListener('submit',ev=>{const f=ev.target.closest('.contactForm');if(!f)return;ev.preventDefault();if(edit){send({action:'link-hint'});return;}const d=new FormData(f);const body='Name: '+d.get('name')+'\nEmail: '+d.get('email')+'\n\n'+d.get('message');location.href='mailto:'+f.dataset.recipient+'?subject='+encodeURIComponent('Website enquiry')+'&body='+encodeURIComponent(body);});
    document.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.classList.add('imgError');img.alt='Image unavailable — replace it in the editor';}));
    let scrollTimer;window.addEventListener('scroll',()=>{if(edit){clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>send({action:'scroll',y:window.scrollY}),100);}});window.addEventListener('hashchange',()=>navigate(location.hash));if(location.hash)navigate(location.hash);
    send({action:'ready'});
  };
  const full = pages.map((name,i) => `<main class="page" data-page="${e(name)}" data-anchor="page-${i}"${name!==p.page?' hidden':''}>${p.pages[name].map(section).join('')}</main>`).join('');
  return `<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(p.name)} — ${e(p.city)}</title><meta name="description" content="${e(p.industry + ' in ' + p.city + '. Contact ' + p.name + ' to discuss your project.')}" >${options.noindex?'<meta name="robots" content="noindex,nofollow">':''}<style>${rules}</style></head><body${editable?' class="editing"':''}><header><div class="wrap nav"><a class="brand" href="#page-0">${p.logo?`<img src="${e(p.logo)}" alt="${e(p.name)}">`:e(p.name)}</a><nav aria-label="Main navigation">${pages.map((name,i)=>`<a href="#page-${i}">${e(name)}</a>`).join('')}<a class="siteButton" href="${e(buttonLink)}">${e(p.cta)}</a></nav></div></header>${full}<footer class="footer"><div class="wrap">${e(p.name)} · ${e(p.city)}</div></footer><script>(${runtime.toString()})(${editable});<\/script></body></html>`;
}
// A dependency-free ZIP writer (stored entries); uploaded image data stays inside index.html.
export function makeZip(files) {
  const enc = new TextEncoder(), chunks = [], central = []; let offset = 0;
  function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
  function header(size){const a=new Uint8Array(size);return [a,new DataView(a.buffer)];}
  for(const [name,value] of Object.entries(files)){
    const fn=enc.encode(name), bytes=enc.encode(value), sum=crc(bytes), [h,v]=header(30);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,sum,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,fn.length,true);
    chunks.push(h,fn,bytes);const [ch,cv]=header(46);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,sum,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,fn.length,true);cv.setUint32(42,offset,true);central.push(ch,fn);offset+=h.length+fn.length+bytes.length;
  }
  const size=central.reduce((n,x)=>n+x.length,0),[end,ev]=header(22);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,Object.keys(files).length,true);ev.setUint16(10,Object.keys(files).length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);
  return new Blob([...chunks,...central,end],{type:'application/zip'});
}
