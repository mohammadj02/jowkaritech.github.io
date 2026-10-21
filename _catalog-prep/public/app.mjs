import {VERSION,FIELDS,LIMITS,SAMPLE,parseCSV,guessMapping,defaultSettings,convert,csvOutput,saveableMapping,compatibleMapping} from './core.mjs';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='jowkari.catalog.mapping.v1';let table=null,original=null,mapping={},settings=defaultSettings(),result=null,worker=null,pending=null,generation=0,page=0,filename='',file=null;
function status(message,bad=false){$('status').textContent=message;$('status').className=bad?'status error':'status';}
function invalidate(){result=null;for(const id of ['issues','issuesMore','changes','auditBody','outputHead','outputBody','outputNotice','resultTitle'])$(id).replaceChildren();$('review').hidden=true;$('ack').checked=false;$('exportAll').disabled=true;$('exportSample').disabled=true;$('report').disabled=true;}
function clearRenderedSource(){for(const id of ['sourceHead','sourceBody','mapping','fileSummary','blankNotice','pageLabel'])$(id).replaceChildren();mapping={};settings=defaultSettings();}
function stop(){if(pending){clearTimeout(pending.timer);pending.reject(Error('Operation cancelled.'));pending=null;}worker?.terminate();worker=null;}
function freshWorker(){worker=new Worker('./parser.js');worker.onmessage=event=>{if(!pending)return;const p=pending;pending=null;clearTimeout(p.timer);event.data.ok?p.resolve(event.data):p.reject(Error(event.data.error));};worker.onerror=()=>{if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(Error('The file reader could not start. Reload the page or use a UTF-8 CSV.'));}};}
function request(data,transfers=[]){return new Promise((resolve,reject)=>{if(!worker)freshWorker();if(pending){reject(Error('Please wait for the current file to finish.'));return;}pending={resolve,reject,timer:setTimeout(()=>{stop();status('File processing exceeded 10 seconds. Use a smaller CSV or workbook.',true);},10000)};worker.postMessage(data,transfers);});}
function busy(on){$('file').disabled=on;$('sample').disabled=on;$('sheet').disabled=on;$('delimiter').disabled=on;$('fileBusy').hidden=!on;}
function accept(t){table=t;original=t.rows.map(r=>[...r]);mapping=guessMapping(t.headers);settings=defaultSettings();page=0;invalidate();$('workspace').hidden=false;$('fileSummary').textContent=filename+' · '+t.rows.length+' rows · '+t.headers.length+' columns';$('blankNotice').textContent=t.blankRows.length?t.blankRows.length+' empty records were skipped (listed in the review report).':'';renderMapping();renderSource();status('File read locally. Confirm the column mapping and selling-price currency before validation.');}
async function load(f){
 generation++;const ticket=generation;stop();invalidate();clearRenderedSource();table=null;original=null;file=f;$('workspace').hidden=true;$('sheetWrap').hidden=true;
 if(!f)return;filename=f.name;const ext=f.name.split('.').pop().toLowerCase();
 if(!['csv','xlsx'].includes(ext)){status('Use a .csv or .xlsx file. PDFs, XLS and macro-enabled workbooks are not supported.',true);return;}
 if(f.size>LIMITS.bytes){status('Choose a file smaller than 2 MB.',true);return;}
 busy(true);status('Reading your file on this device…');
 try{const buffer=await f.arrayBuffer();if(ticket!==generation)return;const data=await request({kind:ext,buffer,delimiter:$('delimiter').value},[buffer]);if(ticket!==generation)return;
  if(data.sheets?.length){$('sheet').innerHTML=data.sheets.map(n=>'<option>'+esc(n)+'</option>').join('');$('sheetWrap').hidden=false;const first=await request({kind:'sheet',sheet:data.sheets[0]});if(ticket===generation)accept(first.table);}
  else accept(data.table);
 }catch(e){if(ticket===generation)status(e.message,true);}finally{if(ticket===generation)busy(false);}
}
$('file').onchange=ev=>load(ev.target.files[0]);
$('delimiter').onchange=()=>{if(file?.name.toLowerCase().endsWith('.csv'))load(file);};
$('sheet').onchange=async()=>{generation++;const ticket=generation;invalidate();clearRenderedSource();table=null;$('workspace').hidden=true;busy(true);try{const data=await request({kind:'sheet',sheet:$('sheet').value});if(ticket===generation)accept(data.table);}catch(e){if(ticket===generation)status(e.message,true);}finally{if(ticket===generation)busy(false);}};
$('sample').onclick=()=>{$('delimiter').value=',';load(new File([SAMPLE],'example-supplier.csv',{type:'text/csv'}));};
$('clear').onclick=()=>{generation++;stop();busy(false);clearRenderedSource();$('sheet').replaceChildren();table=null;original=null;file=null;filename='';$('file').value='';$('workspace').hidden=true;$('sheetWrap').hidden=true;invalidate();status('File and working results cleared from the app. Any saved mapping remains until you forget it.');};
function renderMapping(){
 $('mapping').innerHTML=FIELDS.map(([key,label,required])=>'<label for="map-'+key+'">'+label+(required?' <span class="required">Required</span>':'')+'<select id="map-'+key+'" data-map="'+key+'"><option value="-1">'+(required?'Choose a column':'Do not include')+'</option>'+table.headers.map((h,i)=>'<option value="'+i+'" '+(mapping[key]===i?'selected':'')+'>'+esc(h)+'</option>').join('')+'</select></label>').join('');
 $('decimal').value=settings.decimal;$('currency').value=settings.currency;[1,2,3].forEach((n)=>$('optionName'+n).value=settings.optionNames[n-1]||'');$('mapConfirm').checked=false;
}
$('mapping').onchange=ev=>{if(ev.target.dataset.map){mapping[ev.target.dataset.map]=Number(ev.target.value);$('mapConfirm').checked=false;invalidate();}};
['decimal','currency','optionName1','optionName2','optionName3'].forEach(id=>$(id).oninput=()=>{settings={decimal:$('decimal').value,currency:$('currency').value.trim().toUpperCase(),optionNames:[1,2,3].map(n=>$('optionName'+n).value)};$('mapConfirm').checked=false;invalidate();});
$('mapConfirm').onchange=()=>{if(!$('mapConfirm').checked)invalidate();};
$('saveMap').onclick=()=>{if(!table)return;try{localStorage.setItem(KEY,JSON.stringify(saveableMapping(table.headers,mapping,settings)));status('Saved column names, mapping and settings on this browser. No product rows or filename were saved.');}catch{status('This browser could not save a mapping. You can still process and download files.',true);}};
$('loadMap').onclick=()=>{if(!table)return;try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(!compatibleMapping(saved,table.headers)){status('No saved mapping matches these exact headers. Map this file manually.',true);return;}mapping=saved.mapping;settings=saved.settings;invalidate();renderMapping();status('Mapping loaded. Review it again before validating this file.');}catch{status('The saved mapping could not be read. Use Forget mapping and save a fresh one.',true);}};
$('forgetMap').onclick=()=>{try{localStorage.removeItem(KEY);status('Saved mapping removed.');}catch{status('Browser storage is unavailable.',true);}};
function renderSource(){
 const start=page*25,rows=table.rows.slice(start,start+25);
 $('sourceHead').innerHTML='<tr><th scope="col">Record</th>'+table.headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr>';
 $('sourceBody').innerHTML=rows.map((r,i)=>'<tr><th scope="row">'+table.sourceRows[start+i]+'</th>'+r.map((v,j)=>'<td><input aria-label="Record '+table.sourceRows[start+i]+', '+esc(table.headers[j])+'" data-row="'+(start+i)+'" data-col="'+j+'" value="'+esc(v)+'" maxlength="20000"></td>').join('')+'</tr>').join('');
 $('pageLabel').textContent='Rows '+(start+1)+'–'+Math.min(start+25,table.rows.length)+' of '+table.rows.length;$('prev').disabled=page===0;$('next').disabled=start+25>=table.rows.length;
}
$('prev').onclick=()=>{page--;renderSource();};$('next').onclick=()=>{page++;renderSource();};
$('sourceBody').onchange=ev=>{const {row,col}=ev.target.dataset;if(row===undefined)return;const r=Number(row),c=Number(col);table.rows[r][c]=ev.target.value;table.meta[r][c]={};invalidate();status('Working copy updated. The original file is unchanged. Validate again to refresh the result.');};
$('validate').onclick=()=>{
 if(!table)return;if(!$('mapConfirm').checked){status('Confirm that the mapping and prices are correct first.',true);$('mapConfirm').focus();return;}
 try{
  result=convert(table,mapping,settings);$('review').hidden=false;$('ack').checked=false;$('exportAll').disabled=true;$('exportSample').disabled=true;$('report').disabled=false;
  $('products').textContent=result.products;$('variants').textContent=result.variants;$('blockers').textContent=result.issues.length;
  $('resultTitle').textContent=result.issues.length?'A few things need your attention.':'Ready for a small test import.';
  $('issues').innerHTML=result.issues.slice(0,100).map(i=>'<li><strong>'+(i.row?'Record '+i.row:'Mapping')+' · '+esc(i.field)+'</strong><span>'+esc(i.message)+'</span></li>').join('')||'<li class="pass">No blockers found in the supported checks. This is not a guarantee of a successful Shopify import.</li>';
  $('issuesMore').textContent=result.issues.length>100?'Showing 100 of '+result.issues.length+' issues. The report includes every issue.':'';
  $('changes').textContent=result.changes.length+' formatting changes recorded; prices are not converted. Output is grouped by generated handle. '+result.blankRows.length+' blank records skipped.';
  const edits=[];table.rows.forEach((r,i)=>r.forEach((v,c)=>{if(v!==original[i][c])edits.push({row:table.sourceRows[i],field:table.headers[c],source:original[i][c],output:v,rule:'Manual edit to working copy'});}));result.manualEdits=edits;
  $('auditBody').innerHTML=[...edits,...result.changes].slice(0,30).map(c=>'<tr><td>'+c.row+'</td><td>'+esc(c.field)+'</td><td>'+esc(c.source)+'</td><td>'+esc(c.output)+'</td><td>'+esc(c.rule)+'</td></tr>').join('')||'<tr><td colspan="5">No source values were trimmed or manually changed. Generated handles, draft status and option defaults appear in the export preview below.</td></tr>';
  $('outputHead').innerHTML='<tr>'+result.headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr>';
  $('outputBody').innerHTML=result.output.slice(0,12).map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
  $('outputNotice').textContent='First '+Math.min(12,result.output.length)+' output rows shown. '+(result.issues.length?'Export is blocked until every issue is resolved.':'The downloads include the full result, or up to three complete products for a test.');
  status(result.issues.length?'Resolve the listed blockers in the working copy or source, then validate again.':'Validation finished. Read the export checklist before downloading.',!!result.issues.length);$('review').scrollIntoView({behavior:'smooth'});
 }catch(e){invalidate();status(e.message,true);}
};
$('ack').onchange=()=>{const allowed=!!result&&!result.issues.length&&$('ack').checked;$('exportAll').disabled=!allowed;$('exportSample').disabled=!allowed;};
function download(text,name,type){const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function exportResult(sample){try{if(!$('ack').checked)throw Error('Read and confirm the export checklist.');download(csvOutput(result,sample),sample?'catalog-prep-test-products.csv':'catalog-prep-draft-products.csv','text/csv;charset=utf-8');status('Downloaded '+(sample?'test subset':'full draft CSV')+'. No store was connected or changed.');}catch(e){status(e.message,true);}}
$('exportAll').onclick=()=>exportResult(false);$('exportSample').onclick=()=>exportResult(true);
$('report').onclick=()=>{if(result)download(JSON.stringify({tool:'JowkariTech Catalog Prep',version:VERSION,currency:result.currency,sourceRows:table.rows.length,products:result.products,variants:result.variants,issues:result.issues,formattingChanges:result.changes,manualEdits:result.manualEdits,blankRecords:result.blankRows,limitations:['New draft products only.','Not tested against your Shopify store.','Image availability, store currency, taxes, shipping, inventory and existing handles must be checked separately.']},null,2),'catalog-prep-review.json','application/json');};
$('downloadExample').onclick=()=>download(SAMPLE,'example-supplier.csv','text/csv;charset=utf-8');
$('copyEmail').onclick=async()=>{try{await navigator.clipboard.writeText('jowkaritech@gmail.com');status('Business email copied.');}catch{status('Email: jowkaritech@gmail.com');}};
window.addEventListener('beforeunload',ev=>{if(table){ev.preventDefault();ev.returnValue='';}});
