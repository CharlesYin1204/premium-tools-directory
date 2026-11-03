import ExcelJS from 'exceljs';
import unzipper from 'unzipper';
import {parseCsv} from './import-csv.js';
function cellText(cell,header=''){
 const v=cell.value;if(v==null)return '';
 if(v instanceof Date)return v.toISOString();
 if(typeof v==='object'){
  if(v.error)throw Error('表格包含错误单元格，请修正后重传');
  if(v.formula||v.sharedFormula){if(v.result===undefined)throw Error('公式没有已保存的计算结果，请在Excel中计算并保存后重传');return typeof v.result==='object'?cellText({value:v.result}):String(v.result);}
  if(v.richText)return v.richText.map(r=>r.text).join('');
  if(v.hyperlink)return /url|网址|链接|地址|^link$/i.test(header)?v.hyperlink:String(v.text||'');
 }
 return String(v);
}
export async function parseSpreadsheet(bytes,extension){
 if(extension==='csv')return {parsed:parseCsv(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};
 let workbook;
 try{
  const archive=await unzipper.Open.buffer(bytes);
  if(archive.files.length>2000||archive.files.reduce((n,f)=>n+f.uncompressedSize,0)>20*1024*1024)throw Error('文件展开后过大，请删除无关工作表、图片和多余格式后上传');
  workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);
 }catch(e){if(e.message.includes('文件展开后'))throw e;throw Error('无法读取XLSX，请确认文件未损坏、未加密，且不是改后缀的XLS文件');}
 const visible=workbook.worksheets.filter(s=>s.state==='visible');
 if(visible.length>20)throw Error('最多支持20个可见工作表');
 const sheets=visible.map(sheet=>{
  try{
   const rows=[];
   sheet.eachRow(row=>{
    if(row.cellCount>100)throw Error('工作表超过100列，请移除多余列');
    const values=Array.from({length:row.cellCount},(_,i)=>cellText(row.getCell(i+1),rows[0]?.[i]||''));
    if(values.some(v=>v.trim()))rows.push(values);
    if(rows.length>501)throw Error('每个工作表最多500条数据');
   });
   if(!rows.length)return null;
   const width=Math.max(...rows.map(r=>r.length));
   const csv=rows.map(row=>Array.from({length:width},(_,i)=>'"'+(row[i]||'').replaceAll('"','""')+'"').join(',')).join('\n');
   return {name:sheet.name,parsed:{...parseCsv(csv),sheet_name:sheet.name}};
  }catch(e){return {name:sheet.name,parse_error:e.message};}
 }).filter(Boolean);
 if(!sheets.length)throw Error('文件没有可导入的可见工作表');
 const first=sheets.find(s=>s.parsed)||sheets[0];
 return {sheets,parsed:first.parsed||null,parse_error:first.parse_error||null};
}
