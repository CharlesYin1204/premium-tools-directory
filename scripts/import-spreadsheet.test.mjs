import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {parseSpreadsheet} from '../lib/import-spreadsheet.js';
test('xlsx工作表、中文、空单元格、超链接及缓存公式',async()=>{
 const wb=new ExcelJS.Workbook();wb.addWorksheet('空白');const ws=wb.addWorksheet('站点');
 ws.addRow(['网站名称','网址','排序','简介']);ws.addRow(['名称',{text:'访问',hyperlink:'https://example.org'},0,'']);
 ws.addRow([{richText:[{text:'富'},{text:'文本'}]},'',{formula:'1+1',result:2},'含,逗号']);
 wb.addWorksheet('第二表').addRows([['名称','网址'],['其他','']]);const hidden=wb.addWorksheet('隐藏',{state:'hidden'});hidden.addRows([['名称'],['隐藏']]);
 const r=await parseSpreadsheet(Buffer.from(await wb.xlsx.writeBuffer()),'xlsx');
 assert.equal(r.sheets.length,2);assert.equal(r.parsed.sheet_name,'站点');
 assert.deepEqual(r.parsed.rows,[['名称','https://example.org','0',''],['富文本','','2','含,逗号']]);
});
test('损坏xlsx拒绝，CSV仍可读取，超过500条提示错误',async()=>{
 await assert.rejects(parseSpreadsheet(Buffer.from('invalid'),'xlsx'),/无法读取XLSX/);
 assert.equal((await parseSpreadsheet(Buffer.from('name,url\n名称,'),'csv')).parsed.rows.length,1);
 const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('超限');ws.addRow(['名称']);for(let i=0;i<501;i++)ws.addRow(['名称']);
 const r=await parseSpreadsheet(Buffer.from(await wb.xlsx.writeBuffer()),'xlsx');assert.match(r.parse_error,/500/);
});
