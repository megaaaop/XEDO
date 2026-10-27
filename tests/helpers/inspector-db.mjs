import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

// Local PostgreSQL only. auth.users/sessions and JWT claims are controlled test
// fixtures, not real Supabase password authentication or concurrent connections.
export async function createInspectorDatabase(){
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema public,auth to authenticated,anon;`);
  await db.exec(await readFile(new URL('../../db/inspector-foundation.sql',import.meta.url),'utf8'));
  const actors={};
  for(const name of ['alice','bob','unapproved']){
    const actor={id:randomUUID(),sid:randomUUID(),email:'inspector-'+name+'@example.test'};actors[name]=actor;
    await db.query('insert into auth.users values($1)',[actor.id]);
    await db.query("insert into auth.sessions values($1,$2,now()+interval '1 hour')",[actor.sid,actor.id]);
    if(name!=='unapproved')await db.query('insert into xedo_private.inspector_accounts(user_id) values($1)',[actor.id]);
  }
  const rpc=async(actor,action,payload={},claims={})=>db.transaction(async tx=>{
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor?.id,session_id:actor?.sid,exp:Math.floor(Date.now()/1000)+3600,...claims})]);
    return (await tx.query('select public.xedo_inspector($1,$2::jsonb) as data',[action,JSON.stringify(payload)])).rows[0].data;
  });
  return {db,actors,rpc};
}
