export const attributionColumns={page_view_id:'VARCHAR(80) NULL',impression_id:'VARCHAR(80) NULL',impression_key:'CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL',attribution_status:'VARCHAR(24) NULL'};
export async function migrateAttribution(db){
 const [columns]=await db.query('SHOW COLUMNS FROM events'),known=new Set(columns.map(c=>c.Field));
 const additions=Object.entries(attributionColumns).filter(([name])=>!known.has(name));
 if(additions.length)await db.query('ALTER TABLE events '+additions.map(([name,type])=>`ADD COLUMN ${name} ${type}`).join(','));
 const [indexes]=await db.query('SHOW INDEX FROM events');
 if(!indexes.some(i=>i.Key_name==='events_impression_key'))await db.query('ALTER TABLE events ADD UNIQUE INDEX events_impression_key(impression_key)');
 return additions.map(([name])=>name);
}
