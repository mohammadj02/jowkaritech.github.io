/* Dedicated worker: source files remain in the browser. No network fetch of supplier data. */
let workbook=null,api=null;
function zipGuard(buffer){
 const v=new DataView(buffer);if(v.byteLength<22||v.getUint32(0,true)!==0x04034b50)throw Error('Choose a standard, unencrypted .xlsx workbook.');
 let end=-1;for(let i=v.byteLength-22;i>=Math.max(0,v.byteLength-65557);i--){if(v.getUint32(i,true)===0x06054b50){end=i;break;}}
 if(end<0)throw Error('The workbook archive is incomplete.');
 const count=v.getUint16(end+10,true);let pos=v.getUint32(end+16,true),expanded=0;
 if(!count||count>600||count===65535)throw Error('This workbook is too complex for the pilot. Export one sheet as UTF-8 CSV.');
 for(let i=0;i<count;i++){
  if(pos+46>v.byteLength||v.getUint32(pos,true)!==0x02014b50)throw Error('The workbook archive is invalid.');
  const flags=v.getUint16(pos+8,true),packed=v.getUint32(pos+20,true),size=v.getUint32(pos+24,true),name=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true);
  if(flags&1)throw Error('Password-protected workbooks are not supported.');
  expanded+=size;if(size>12*1024*1024||expanded>20*1024*1024||size>Math.max(1,packed)*500)throw Error('The expanded workbook is too large. Export only the required sheet as CSV.');
  pos+=46+name+extra+comment;
 }
}
self.onmessage=async event=>{
 try{
  api=api||await import('./core.mjs');
  const {kind,buffer,delimiter,sheet}=event.data;
  if(kind==='csv'){
   if(buffer.byteLength>api.LIMITS.bytes)throw Error('Files must be 2 MB or smaller.');
   let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{throw Error('Export the file as UTF-8 CSV. Other encodings are not supported yet.');}
   self.postMessage({ok:true,table:api.parseCSV(text,delimiter),sheets:[]});return;
  }
  if(kind==='xlsx'){
   if(buffer.byteLength>api.LIMITS.bytes)throw Error('Files must be 2 MB or smaller.');
   zipGuard(buffer);
   if(!self.XLSX)importScripts('./vendor/xlsx.mini.min.js');
   workbook=self.XLSX.read(buffer,{type:'array',cellDates:true,cellFormula:true,cellNF:true,cellText:true,bookVBA:false});
   if(workbook.SheetNames.length>20)throw Error('Use a workbook with at most 20 sheets.');
   const visible=workbook.SheetNames.filter((name,i)=>!workbook.Workbook?.Sheets?.[i]?.Hidden);
   if(!visible.length)throw Error('No visible worksheets were found.');
   self.postMessage({ok:true,sheets:visible});return;
  }
  if(kind==='sheet'){
   if(!workbook||!workbook.SheetNames.includes(sheet))throw Error('Select an available sheet.');
   const ws=workbook.Sheets[sheet];if(!ws['!ref'])throw Error('This sheet is empty.');
   const range=self.XLSX.utils.decode_range(ws['!ref']);
   if(range.s.r!==0||range.s.c!==0)throw Error('Place your header at A1. Remove introductory rows and columns first.');
   if(range.e.r>api.LIMITS.rows||range.e.c>=api.LIMITS.columns)throw Error('Use at most 2,000 data rows and 100 columns. Remove unused formatted rows and columns.');
   if(ws['!merges']?.length)throw Error('Unmerge cells and repeat each value on its row before importing.');
   if((ws['!rows']||[]).some(x=>x?.hidden)||(ws['!cols']||[]).some(x=>x?.hidden))throw Error('Unhide rows and columns or export the intended rows into a new sheet. No rows are silently omitted.');
   const records=[],metadata={};
   for(let r=0;r<=range.e.r;r++){
    const values=[];metadata[r+1]={};
    for(let c=0;c<=range.e.c;c++){
     const cell=ws[self.XLSX.utils.encode_cell({r,c})];
     const invalid=cell&&['d','e','b'].includes(cell.t);
     if(r===0&&(cell?.f||invalid))throw Error('Headers must be literal text, not formulas, dates or errors.');
     const text=!cell?'':cell.t==='n'?String(cell.v):cell.t==='d'?'[date cell]':String(cell.v??'');
     values.push(text);
     metadata[r+1][c]={formula:!!(cell?.f||cell?.F),invalid:!!invalid,...(cell?.t==='n'?{numeric:cell.v}:{})};
    }
    records.push(values);
   }
   self.postMessage({ok:true,table:api.tableFromRows(records,metadata)});return;
  }
  throw Error('Unsupported file operation.');
 }catch(error){self.postMessage({ok:false,error:error?.message||'The file could not be read. Try an unencrypted XLSX or UTF-8 CSV.'});}
};
