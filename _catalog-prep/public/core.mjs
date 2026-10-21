export const VERSION='0.1.0';
export const LIMITS={bytes:2*1024*1024,rows:2000,columns:100,cell:20000};
export const FIELDS=[['title','Product title',true],['sku','Variant SKU (text)',true],['price','Selling price',true],['group','Product group ID',false],['vendor','Vendor',false],['description','Plain-text description',false],['option1','Option 1 value',false],['option2','Option 2 value',false],['option3','Option 3 value',false],['image','Product image HTTPS URL',false]];
export const OUTPUT=['URL handle','Title','Description','Vendor','Published on online store','Status','SKU','Option1 name','Option1 value','Option2 name','Option2 value','Option3 name','Option3 value','Price','Product image URL'];
export const SAMPLE='Item,Product name,Retail price,Family,Size,Colour,Brand\r\n000421,Coast cotton tee,29.00,TEE-01,Small,Navy,Example Supply\r\n000422,Coast cotton tee,29.00,TEE-01,Medium,Navy,Example Supply\r\n000423,Coast cotton tee,29.00,TEE-01,Small,Clay,Example Supply\r\n000510,Canvas pouch,18.50,POUCH-01,One size,Natural,Example Supply\r\n';
export function parseCSV(text,delimiter=','){
 if(![',',';','\t'].includes(delimiter))throw Error('Choose comma, semicolon or tab as the delimiter.');
 if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMITS.bytes)throw Error('Choose a CSV file no larger than 2 MB.');
 text=text.replace(/^\uFEFF/,'');if(text.includes('\u0000'))throw Error('This is not a UTF-8 text CSV. Export it as UTF-8 CSV first.');
 const records=[];let row=[],cell='',quoted=false,closed=false;
 const pushCell=()=>{if(cell.length>LIMITS.cell)throw Error('A cell exceeds the 20,000-character limit.');row.push(cell);cell='';closed=false;if(row.length>LIMITS.columns)throw Error('The file exceeds 100 columns.');};
 const pushRow=()=>{pushCell();records.push(row);row=[];if(records.length>LIMITS.rows+1)throw Error('The first version supports up to 2,000 data rows. Split the file before importing.');};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
  else if(c==='"'){if(cell||closed)throw Error('Unexpected quote in CSV record '+(records.length+1)+'.');quoted=true;}
  else if(c===delimiter)pushCell();
  else if(c==='\r'||c==='\n'){pushRow();if(c==='\r'&&text[i+1]==='\n')i++;}
  else{if(closed)throw Error('Unexpected text after a closing quote in record '+(records.length+1)+'.');cell+=c;}
  if(cell.length>LIMITS.cell)throw Error('A cell exceeds the 20,000-character limit.');
 }
 if(quoted)throw Error('The CSV ends inside a quoted cell. Export a fresh CSV and try again.');
 if(cell||row.length||closed)pushRow();
 return tableFromRows(records);
}
export function tableFromRows(records,metadata={}){
 if(!Array.isArray(records)||records.length<2)throw Error('Include one header row and at least one product row.');
 if(records.length>LIMITS.rows+1)throw Error('A sheet can contain at most 2,000 data rows.');
 const headers=records[0].map(x=>String(x??'').trim());
 if(headers.length>LIMITS.columns||headers.length<2)throw Error('Use 2–100 columns. Check the CSV delimiter.');
 if(headers.some(h=>!h||h.length>160)||new Set(headers.map(h=>h.toLowerCase())).size!==headers.length)throw Error('Each header must be unique, non-empty and at most 160 characters.');
 const rows=[],sourceRows=[],meta=[],blankRows=[];
 records.slice(1).forEach((r,i)=>{
  const values=r.map(x=>String(x??''));
  if(values.every(v=>!v.trim())){blankRows.push(i+2);return;}
  if(values.length!==headers.length)throw Error('Record '+(i+2)+' has '+values.length+' columns; the header has '+headers.length+'.');
  if(values.some(v=>v.length>LIMITS.cell))throw Error('Record '+(i+2)+' has a cell longer than 20,000 characters.');
  rows.push(values);sourceRows.push(i+2);meta.push(metadata[i+2]||{});
 });
 if(!rows.length)throw Error('No non-empty product rows were found.');
 return {headers,rows,sourceRows,meta,blankRows};
}
export function guessMapping(headers){
 const aliases={title:['product name','title','product title','name'],sku:['sku','item','item number','variant sku'],price:['selling price','retail price','price','variant price'],group:['family','product group id','parent sku','group id'],vendor:['vendor','brand','supplier'],description:['description','plain-text description'],option1:['size'],option2:['colour','color'],option3:['material'],image:['image url','product image url','image src']};
 return Object.fromEntries(FIELDS.map(([key])=>[key,headers.findIndex(h=>aliases[key].includes(h.toLowerCase().trim()))]));
}
export const defaultSettings=()=>({decimal:'.',optionNames:['Size','Colour','Material'],currency:'CAD'});
const escaped=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dangerous=s=>/^[=+\-@\t\r\n]/.test(s)||/^[\s\uFEFF]*[=+\-@]/.test(s);
const control=s=>/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s);
const slug=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function priceValue(raw,decimal,numeric){
 const s=raw.trim();if(numeric!==undefined){if(!Number.isFinite(numeric)||numeric<0)throw Error('Price must be a non-negative number.');const parts=String(numeric).split('.');if((parts[1]||'').length>2||/e/i.test(String(numeric)))throw Error('Use a price with at most two decimal places.');return parts[0]+'.'+(parts[1]||'').padEnd(2,'0');}
 const pattern=decimal===','?/^\d+(?:,\d{1,2})?$/:/^\d+(?:\.\d{1,2})?$/;
 if(!pattern.test(s))throw Error('Use a non-negative price with '+(decimal===','?'comma':'dot')+' decimals, no currency symbol or thousands separators.');
 const [whole,frac='']=s.split(decimal);if(whole.length>9)throw Error('Price is outside this pilot\'s supported range.');return whole.replace(/^0+(?=\d)/,'')+'.'+frac.padEnd(2,'0');
}
function imageURL(s){if(!s)return '';try{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password||/\s/.test(s)||!u.hostname.includes('.')||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname))throw Error();return s;}catch{throw Error('Use one public HTTPS product-image URL, or leave it blank.');}}
export function convert(table,mapping,settings=defaultSettings()){
 const issues=[],changes=[],out=[],groups=new Map(),handles=new Map(),skus=new Map();
 const add=(row,field,message,code='invalid')=>issues.push({row,field,message,code});
 if(!table?.rows?.length)throw Error('Choose a file first.');
 const active=new Set();
 for(const [key,label,required] of FIELDS){const col=mapping[key];if(required&&(!Number.isInteger(col)||col<0))add(0,label,'Map this required field.','mapping');if(Number.isInteger(col)&&col>=0){if(col>=table.headers.length)add(0,label,'Mapped column no longer exists.','mapping');if(active.has(col))add(0,label,'One source column cannot be assigned to two output fields.','mapping');active.add(col);}}
 if(!['.',','].includes(settings.decimal))add(0,'Price','Select a decimal format.');
 if(!/^[A-Z]{3}$/.test(settings.currency||''))add(0,'Currency','Enter the three-letter currency of the selling prices. This tool does not convert currency.');
 const options=['option1','option2','option3'].filter(k=>mapping[k]>=0);
 if(options.some((k,i)=>k!=='option'+(i+1)))add(0,'Options','Map options in order, starting with Option 1.');
 if(options.length&&!(mapping.group>=0))add(0,'Product group ID','Variants require an explicit product-group column; products are never grouped by similar titles.');
 const optionNames=(settings.optionNames||[]).map(x=>String(x).trim());
 options.forEach((key,i)=>{if(!optionNames[i]||optionNames[i].length>60||dangerous(optionNames[i])||control(optionNames[i]))add(0,key,'Enter a short, safe option name.');});
 if(new Set(optionNames.slice(0,options.length).map(x=>x.toLowerCase())).size!==options.length)add(0,'Options','Option names must be distinct.');
 if(issues.length)return {issues,changes,output:[],headers:OUTPUT,products:0,variants:0,blankRows:table.blankRows||[],currency:settings.currency};
 table.rows.forEach((row,index)=>{
  const n=table.sourceRows[index],data={},metadata=table.meta[index]||{};
  for(const [key,label] of FIELDS){const col=mapping[key];const raw=col>=0?String(row[col]??''):'';data[key]=raw.trim();
   if(col<0)continue;
   const m=metadata[col]||{};
   if(m.formula)add(n,label,'Formula cells are not evaluated. Replace with reviewed values first.','formula');
   if(m.invalid)add(n,label,'This cell is a date, boolean, error or unsupported value. Export reviewed plain text.','cell-type');
   if(dangerous(raw)||dangerous(data[key]))add(n,label,'Formula-like text is blocked, not silently rewritten. Correct this value in the source file.','unsafe-text');
   if(control(raw))add(n,label,'Unsupported control character.','unsafe-text');
   if(raw!==data[key])changes.push({row:n,field:label,source:raw,output:data[key],rule:'Trim outer whitespace'});
   if(['sku','group'].includes(key)&&m.numeric!==undefined)add(n,label,'This identifier is stored as a number in Excel. Convert it to actual text and confirm leading zeros and precision.','numeric-id');
  }
  if(!data.title||data.title.length>255)add(n,'Product title','Supply a title of 1–255 characters.');
  if(!data.sku||data.sku.length>100)add(n,'SKU','Supply a unique text SKU of 1–100 characters.');
  if(/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(data.sku))add(n,'SKU','Scientific-notation identifiers need correction in the source file.','numeric-id');
  if(skus.has(data.sku))add(n,'SKU','Duplicate SKU; first occurrence is record '+skus.get(data.sku)+'.','duplicate-sku');else skus.set(data.sku,n);
  const group=mapping.group>=0?data.group:data.sku;
  if(!group||group.length>120)add(n,'Product group ID','Supply a product group ID of 1–120 characters.');
  const handle='cp-'+slug(group);
  if(handle==='cp-')add(n,'URL handle','The source identifier needs at least one ASCII letter or number.');
  if(handles.has(handle)&&handles.get(handle)!==group)add(n,'URL handle','Different group IDs produce the same URL handle. Change the source identifiers.','handle-collision');else handles.set(handle,group);
  let price='';try{price=priceValue(data.price,settings.decimal,metadata[mapping.price]?.numeric);if(price!==data.price)changes.push({row:n,field:'Price',source:data.price,output:price,rule:'Format existing price; no currency conversion'});}catch(e){add(n,'Price',e.message);}
  let image='';try{image=imageURL(data.image);}catch(e){add(n,'Product image URL',e.message);}
  const vals=options.map(k=>data[k]);options.forEach((k,i)=>{if(!data[k]||data[k].length>255)add(n,optionNames[i],'Every variant needs a value for each selected option.');});
  const signature=JSON.stringify(vals.length?vals:['Default Title']);
  const fingerprint=JSON.stringify([data.title,data.vendor,data.description]);let g=groups.get(group);
  if(!g){g={first:n,fingerprint,variants:new Set()};groups.set(group,g);}else if(g.fingerprint!==fingerprint)add(n,'Product group','Title, vendor and description must be identical within one group. No values are guessed or carried forward.','group-conflict');
  if(g.variants.has(signature))add(n,'Options',options.length?'Duplicate option combination in this product group.':'Repeated group without distinct options. Map options or separate the products.','duplicate-variant');g.variants.add(signature);
  if(g.variants.size>100)add(n,'Options','This pilot supports up to 100 variants per product.');
  const description=data.description?'<p>'+escaped(data.description).replace(/\r?\n/g,'<br>')+'</p>':'';
  out.push([handle,data.title,description,data.vendor,'false','draft',data.sku,options.length?optionNames[0]:'Title',options.length?vals[0]:'Default Title',options.length>1?optionNames[1]:'',options.length>1?vals[1]:'',options.length>2?optionNames[2]:'',options.length>2?vals[2]:'',price,image]);
 });
 // Keep all variants of a product contiguous without dropping or merging source rows.
 out.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 return {issues,changes,output:out,headers:OUTPUT,products:groups.size,variants:out.length,blankRows:table.blankRows||[],currency:settings.currency};
}
export function csvOutput(result,sample=false){
 if(result.issues.length)throw Error('Resolve every blocker before exporting. No partial catalogue was exported.');
 let rows=result.output;
 if(sample){const handles=[...new Set(rows.map(r=>r[0]))].slice(0,3);rows=rows.filter(r=>handles.includes(r[0]));}
 const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 return [result.headers,...rows].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n';
}
export function saveableMapping(headers,mapping,settings){return {version:1,headers:[...headers],mapping:Object.fromEntries(FIELDS.map(([key])=>[key,Number.isInteger(mapping[key])?mapping[key]:-1])),settings:{decimal:settings.decimal,currency:settings.currency,optionNames:[...settings.optionNames]}};}
export function compatibleMapping(saved,headers){return saved?.version===1&&JSON.stringify(saved.headers)===JSON.stringify(headers)&&saved.mapping&&saved.settings;}
