export function database(env) {
  if(!env.DB) throw new Error('The database is unavailable.');
  return {first:(q,...v)=>env.DB.prepare(q).bind(...v).first(),all:async(q,...v)=>(await env.DB.prepare(q).bind(...v).all()).results,run:(q,...v)=>env.DB.prepare(q).bind(...v).run(),batch:items=>env.DB.batch(items.map(([q,v])=>env.DB.prepare(q).bind(...v)))};
}
export const unpack=r=>r?{...JSON.parse(r.data),id:r.id,kind:r.kind,revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at}:null;
export const record=async(db,id)=>unpack(await db.first('SELECT * FROM records WHERE id = ?',id));
export const records=async(db,kind)=>(await db.all('SELECT * FROM records WHERE kind = ? ORDER BY created_at DESC',kind)).map(unpack);
export function insertStatement(item,time=new Date().toISOString()) {
  const {id,kind,revision=1,createdAt=time,updatedAt=time,...data}=item;
  return ['INSERT INTO records (id,kind,data,revision,created_at,updated_at) VALUES (?,?,?,?,?,?)',[id,kind,JSON.stringify(data),revision,createdAt,updatedAt]];
}
export function updateStatement(item,expected,time=new Date().toISOString()) {
  const {id,kind,revision,createdAt,updatedAt,...data}=item;
  return ['UPDATE records SET data = ?,revision = revision + 1,updated_at = ? WHERE id = ? AND revision = ?',[JSON.stringify(data),time,id,expected]];
}
