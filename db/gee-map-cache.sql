-- Private imagery cache only. Never modifies Inspector, Auth or worker objects.
create schema xedo_map_cache;
revoke all on schema xedo_map_cache from public, anon, authenticated;
grant usage on schema xedo_map_cache to service_role;
create table xedo_map_cache.budget (
  id boolean primary key default true check(id),
  cap bigint not null default 200000000 check(cap=200000000),
  charged bigint not null default 0 check(charged>=0 and charged<=cap)
);
insert into xedo_map_cache.budget(id) values(true);
create table xedo_map_cache.entries (
  key text primary key check(key ~ '^[a-f0-9]{64}$'),
  generation uuid not null,
  state text not null check(state in ('building','uploading','ready','uncertain','deleting')),
  charge bigint not null check(charge between 1 and 1048576),
  object_path text not null unique,
  content_hash text check(content_hash ~ '^[a-f0-9]{64}$'),
  recipe jsonb not null check(octet_length(recipe::text)<=16384),
  lease_until timestamptz not null,
  expires_at timestamptz not null,
  write_settled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gee_cache_cleanup on xedo_map_cache.entries(state,expires_at,created_at);
alter table xedo_map_cache.budget enable row level security;
alter table xedo_map_cache.entries enable row level security;
revoke all on all tables in schema xedo_map_cache from public,anon,authenticated;
grant select,insert,update,delete on all tables in schema xedo_map_cache to service_role;

-- One allocator lock first, then entry lock: claims on different keys cannot
-- overbook the cap. No network/Storage operation occurs inside a transaction.
create function public.xedo_cache_v1(op text,payload jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path=pg_catalog,xedo_map_cache as $$
declare b xedo_map_cache.budget%rowtype; e xedo_map_cache.entries%rowtype;
  k text:=payload->>'key'; g uuid; n bigint; h text; result jsonb; stamp timestamptz;
begin
  if jsonb_typeof(payload)<>'object' or octet_length(payload::text)>32768 then raise exception 'Invalid cache request' using errcode='22023'; end if;
  select * into b from xedo_map_cache.budget where id=true for update;
  stamp:=clock_timestamp();
  if op='status' then
    return jsonb_build_object('cap',b.cap,'charged',b.charged,'entries',(select count(*) from xedo_map_cache.entries),'states',(select coalesce(jsonb_object_agg(s,c),'{}') from (select state s,count(*) c from xedo_map_cache.entries group by state) t));
  end if;
  if op='cleanup' then
    -- Unknown PUTs remain charged indefinitely: TTL or one 404 cannot settle them.
    select * into e from xedo_map_cache.entries where
      (state='building' and lease_until<=stamp) or state='deleting' or (state='uncertain' and write_settled) or
      (state='ready' and (expires_at<=stamp or b.charged>b.cap-2097152 or (select count(*) from xedo_map_cache.entries)>=4096))
      order by case when state='deleting' then 0 else 1 end,expires_at,created_at limit 1 for update;
    if not found then return jsonb_build_object('state','none');end if;
    if e.state='building' then
      delete from xedo_map_cache.entries where key=e.key;
      update xedo_map_cache.budget set charged=charged-e.charge where id=true;
      return jsonb_build_object('state','released_building');
    end if;
    update xedo_map_cache.entries set state='deleting',updated_at=stamp where key=e.key;
    return jsonb_build_object('state','deleting','key',e.key,'generation',e.generation,'path',e.object_path,'bytes',e.charge);
  end if;
  if k is null or k !~ '^[a-f0-9]{64}$' then raise exception 'Invalid cache key' using errcode='22023';end if;
  select * into e from xedo_map_cache.entries where key=k for update;
  stamp:=clock_timestamp();
  if op='claim' then
    if found and e.state='building' and e.lease_until<=stamp then
      update xedo_map_cache.budget set charged=charged-e.charge where id=true;
      delete from xedo_map_cache.entries where key=k;
      b.charged:=b.charged-e.charge;e.key:=null;
    end if;
    if e.key is not null then
      if e.state='ready' and e.expires_at>stamp then
        return jsonb_build_object('state','hit','path',e.object_path,'hash',e.content_hash,'bytes',e.charge,'generation',e.generation);
      end if;
      if e.state='uploading' and e.lease_until<=stamp then update xedo_map_cache.entries set state='uncertain',updated_at=stamp where key=k;end if;
      return jsonb_build_object('state',case when e.state in ('building','uploading') and e.lease_until>stamp then 'follower' else 'bypass' end);
    end if;
    if b.charged+1048576>b.cap or (select count(*) from xedo_map_cache.entries)>=4096 then return jsonb_build_object('state','bypass');end if;
    g:=(payload->>'generation')::uuid;
    if g is null or jsonb_typeof(payload->'recipe')<>'object' then raise exception 'Invalid cache recipe' using errcode='22023';end if;
    insert into xedo_map_cache.entries(key,generation,state,charge,object_path,recipe,lease_until,expires_at)
      values(k,g,'building',1048576,'v1/'||k||'/'||g::text||'.png',payload->'recipe',stamp+interval '60 seconds',least(stamp+interval '24 hours',date_trunc('day',stamp at time zone 'UTC') at time zone 'UTC'+interval '1 day'));
    update xedo_map_cache.budget set charged=charged+1048576 where id=true;
    return jsonb_build_object('state','leader','generation',g,'path','v1/'||k||'/'||g::text||'.png');
  end if;
  g:=(payload->>'generation')::uuid;
  if e.key is null or g is null or e.generation<>g then return jsonb_build_object('state','stale');end if;
  if op='begin_write' then
    n:=(payload->>'bytes')::bigint;h:=payload->>'hash';
    if e.state<>'building' or e.lease_until<=stamp then return jsonb_build_object('state','stale');end if;
    if n is null or n<1 or n>e.charge or h is null or h !~ '^[a-f0-9]{64}$' then raise exception 'Invalid cache bytes' using errcode='22023';end if;
    update xedo_map_cache.entries set state='uploading',charge=n,content_hash=h,updated_at=stamp where key=k;
    update xedo_map_cache.budget set charged=charged-e.charge+n where id=true;
    return jsonb_build_object('state','uploading');
  elsif op='publish' then
    if e.state<>'uploading' then return jsonb_build_object('state','stale');end if;
    update xedo_map_cache.entries set state=case when lease_until>stamp then 'ready' else 'uncertain' end,write_settled=true,updated_at=stamp where key=k;
    return jsonb_build_object('state',case when e.lease_until>stamp then 'ready' else 'uncertain' end);
  elsif op='uncertain' then
    if e.state in ('uploading','uncertain') then
      update xedo_map_cache.entries set state='uncertain',write_settled=write_settled or coalesce((payload->>'settled')::boolean,false),updated_at=stamp where key=k;
    end if;
    return jsonb_build_object('state','retained');
  elsif op='cancel_unstarted' then
    -- Sole fenced producer asserts this BEFORE dispatching any PUT. This is
    -- never used for a timed-out or failed PUT, even if the object returns404.
    if e.state<>'uploading' or e.content_hash is distinct from payload->>'hash' then return jsonb_build_object('state','retained');end if;
    delete from xedo_map_cache.entries where key=k;
    update xedo_map_cache.budget set charged=charged-e.charge where id=true;
    return jsonb_build_object('state','released');
  elsif op='release_build' then
    if e.state<>'building' then return jsonb_build_object('state','retained');end if;
    delete from xedo_map_cache.entries where key=k;
    update xedo_map_cache.budget set charged=charged-e.charge where id=true;
    return jsonb_build_object('state','released');
  elsif op='discard' then
    if e.state='ready' then update xedo_map_cache.entries set state='deleting',updated_at=stamp where key=k;end if;
    return jsonb_build_object('state','deleting');
  elsif op='deleted' then
    if e.state<>'deleting' then return jsonb_build_object('state','retained');end if;
    delete from xedo_map_cache.entries where key=k;
    update xedo_map_cache.budget set charged=charged-e.charge where id=true;
    return jsonb_build_object('state','released');
  end if;
  raise exception 'Invalid cache operation' using errcode='22023';
end $$;
revoke all on function public.xedo_cache_v1(text,jsonb) from public,anon,authenticated;
grant usage on schema public to service_role;
grant execute on function public.xedo_cache_v1(text,jsonb) to service_role;
-- Bucket creation is supported by Supabase; file deletion must use Storage API.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('xedo-gee-map-cache-v1','xedo-gee-map-cache-v1',false,1048576,array['image/png']);
