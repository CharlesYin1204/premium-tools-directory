// The caller supplies only resources already resolved by the server.
export function eventResourceMode(...resources){const known=resources.filter(Boolean);return !known.length?'none':known.some(r=>r.is_demo)?'demo':'real';}
export async function migrateEventResourceMode(db){const [columns]=await db.query("SHOW COLUMNS FROM events LIKE 'resource_mode'");if(!columns.length)await db.query('ALTER TABLE events ADD COLUMN resource_mode VARCHAR(16) NULL');return !columns.length;}
