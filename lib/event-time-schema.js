export const eventTimeColumns={received_at:'DATETIME(3) NULL',client_occurred_at:'DATETIME(3) NULL',time_basis:'VARCHAR(24) NULL'};
export async function migrateEventTime(db){
 const [columns]=await db.query('SHOW COLUMNS FROM events');const known=new Set(columns.map(c=>c.Field));
 const additions=Object.entries(eventTimeColumns).filter(([name])=>!known.has(name));
 if(additions.length)await db.query('ALTER TABLE events '+additions.map(([name,type])=>`ADD COLUMN ${name} ${type}`).join(','));
 return additions.map(([name])=>name);
}
