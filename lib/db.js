import mysql from 'mysql2/promise';
const g=globalThis;
export const pool=g.__bdpool||mysql.createPool({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectionLimit:6,charset:'utf8mb4',timezone:'Z',dateStrings:true});
if(process.env.NODE_ENV!=='production')g.__bdpool=pool;
export async function query(sql,values=[],db=pool){const [rows]=await db.execute(sql,values);return rows;}
export function decode(v){return typeof v==='string'?JSON.parse(v):v;}
export async function transaction(fn){const c=await pool.getConnection();await c.beginTransaction();try{const r=await fn(c);await c.commit();return r;}catch(e){await c.rollback();throw e;}finally{c.release();}}
