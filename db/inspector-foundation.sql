-- XEDO Inspector foundation. Apply through Supabase apply_migration after inspection.
-- No real accounts or mission data are provisioned by this migration.
create schema xedo_private;
revoke all on schema xedo_private from public, anon, authenticated;
grant usage on schema xedo_private to authenticated;

create table xedo_private.inspector_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table xedo_private.revoked_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  revoked_at timestamptz not null default now()
);
create table xedo_private.mission_heads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  current_revision integer not null check (current_revision >= 1),
  title text not null check (length(title) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mission_heads_owner_updated on xedo_private.mission_heads(owner_id, updated_at desc, id);
create table xedo_private.mission_revisions (
  mission_id uuid not null references xedo_private.mission_heads(id) on delete cascade,
  revision integer not null check (revision >= 1),
  parent_revision integer,
  document jsonb not null,
  document_hash text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(mission_id, revision)
);
create table xedo_private.mutation_receipts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  request_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key(owner_id, mutation_id)
);
alter table xedo_private.inspector_accounts enable row level security;
alter table xedo_private.revoked_sessions enable row level security;
alter table xedo_private.mission_heads enable row level security;
alter table xedo_private.mission_revisions enable row level security;
alter table xedo_private.mutation_receipts enable row level security;
-- No direct user table grants. All access uses the audited owner-checked routine.
revoke all on all tables in schema xedo_private from public, anon, authenticated;

create function xedo_private.require_inspector(p_allow_disabled boolean default false) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); sid uuid := (auth.jwt()->>'session_id')::uuid;
begin
  if actor is null or sid is null or coalesce((auth.jwt()->>'exp')::bigint,0) <= extract(epoch from now())
     or not exists(select 1 from auth.sessions s where s.id=sid and s.user_id=actor and (s.not_after is null or s.not_after>now()))
     or exists(select 1 from xedo_private.revoked_sessions s where s.session_id=sid)
  then raise sqlstate 'PT401' using message='SESSION_REQUIRED'; end if;
  if not p_allow_disabled and not exists(select 1 from xedo_private.inspector_accounts a where a.user_id=actor and a.enabled)
  then raise sqlstate 'PT403' using message='INSPECTOR_NOT_PROVISIONED'; end if;
  return actor;
end $$;

create function xedo_private.inspector_request(p_action text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
  mid uuid; mutation uuid; expected integer; wanted integer; offset_n integer;
  head xedo_private.mission_heads%rowtype; receipt xedo_private.mutation_receipts%rowtype;
  doc jsonb; request_hash text; doc_hash text; result jsonb; committed_at timestamptz := now();
begin
  -- Serialize requests for one session so logout completes after earlier writes;
  -- requests waiting behind logout must recheck revocation before doing any work.
  perform pg_advisory_xact_lock(hashtextextended('session:'||coalesce(auth.jwt()->>'session_id','missing'),0));
  actor := xedo_private.require_inspector(p_action='logout');
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>1100000
  then raise sqlstate 'PT422' using message='INVALID_REQUEST'; end if;
  if p_action='session' then return jsonb_build_object('id',actor,'role','Inspector'); end if;
  if p_action='logout' then
    insert into xedo_private.revoked_sessions(session_id,user_id) values ((auth.jwt()->>'session_id')::uuid,actor) on conflict do nothing;
    return jsonb_build_object('revoked',true);
  end if;
  if p_action in ('list','history') then
    offset_n := coalesce((p_payload->>'offset')::integer,0);
    if offset_n<0 or offset_n>100000 then raise sqlstate 'PT422' using message='INVALID_OFFSET'; end if;
    if p_action='list' then
      select coalesce(jsonb_agg(t.item),'[]') into result from (
        select jsonb_build_object('missionId',h.id,'title',h.title,'revision',h.current_revision,'updatedAt',h.updated_at) item
        from xedo_private.mission_heads h where h.owner_id=actor order by h.updated_at desc,h.id limit 50 offset offset_n
      ) t;
      return result;
    end if;
  end if;
  if p_action in ('get','history') then
    mid := (p_payload->>'missionId')::uuid;
    select * into head from xedo_private.mission_heads where id=mid and owner_id=actor;
    if not found then raise sqlstate 'PT404' using message='MISSION_NOT_FOUND'; end if;
    if p_action='history' then
      select coalesce(jsonb_agg(t.item),'[]') into result from (
        select jsonb_build_object('revision',r.revision,'createdAt',r.created_at,'documentHash',r.document_hash) item
        from xedo_private.mission_revisions r where r.mission_id=mid order by r.revision desc limit 50 offset offset_n
      ) t; return result;
    end if;
    wanted := coalesce((p_payload->>'revision')::integer,head.current_revision);
    select jsonb_build_object('missionId',mid,'revision',r.revision,'currentRevision',head.current_revision,'document',r.document,'documentHash',r.document_hash,'createdAt',r.created_at)
      into result from xedo_private.mission_revisions r where r.mission_id=mid and r.revision=wanted;
    if result is null then raise sqlstate 'PT404' using message='MISSION_NOT_FOUND'; end if;
    return result;
  end if;
  if p_action is distinct from 'save' or p_payload->>'schemaVersion' is distinct from 'xedo-inspector-save/1'
    or p_payload->>'intent' is distinct from 'save_draft'
    or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('schemaVersion','missionId','expectedRevision','mutationId','intent','document'))
  then raise sqlstate 'PT422' using message='DRAFT_SAVE_REQUIRED'; end if;
  mutation := (p_payload->>'mutationId')::uuid; expected := (p_payload->>'expectedRevision')::integer;
  mid := (p_payload->>'missionId')::uuid; doc := p_payload->'document';
  if mutation is null or expected is null or expected<0 or (mid is null and expected<>0) or (mid is not null and expected<1)
    or jsonb_typeof(doc) is distinct from 'object' or doc->>'schemaVersion' is distinct from 'xedo-inspector-mission/1'
    or jsonb_typeof(doc->'title') is distinct from 'string' or length(btrim(doc->>'title')) not between 1 and 160
    or not (doc ?& array['schemaVersion','title','inputMode','searchGeometry','imageSelection','analysisRef','riskDraft','planningInputs'])
    or coalesce(doc->>'inputMode','') not in ('mission','estimated_demo')
    or jsonb_typeof(doc->'planningInputs') is distinct from 'object' or octet_length((doc->'planningInputs')::text)>65536
    or octet_length(doc::text)>1048576
    or exists(select 1 from jsonb_object_keys(doc) k where k not in ('schemaVersion','title','inputMode','searchGeometry','imageSelection','analysisRef','riskDraft','planningInputs'))
  then raise sqlstate 'PT422' using message='INVALID_DOCUMENT'; end if;
  request_hash := encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
  -- Serialize duplicate mutation IDs before looking up the receipt, including creates.
  perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||mutation::text,0));
  select * into receipt from xedo_private.mutation_receipts where owner_id=actor and mutation_id=mutation;
  if found then
    if receipt.request_hash<>request_hash then raise sqlstate 'PT409' using message='MUTATION_REUSED'; end if;
    return receipt.response;
  end if;
  if mid is null then
    insert into xedo_private.mission_heads(owner_id,current_revision,title) values(actor,1,btrim(doc->>'title')) returning * into head;
    mid := head.id; wanted := 1;
  else
    select * into head from xedo_private.mission_heads where id=mid and owner_id=actor for update;
    if not found then raise sqlstate 'PT404' using message='MISSION_NOT_FOUND'; end if;
    if head.current_revision<>expected then raise sqlstate 'PT409' using message='REVISION_CONFLICT'; end if;
    wanted := expected+1;
    update xedo_private.mission_heads set current_revision=wanted,title=btrim(doc->>'title'),updated_at=committed_at where id=mid;
  end if;
  doc_hash := encode(sha256(convert_to(doc::text,'UTF8')),'hex');
  insert into xedo_private.mission_revisions(mission_id,revision,parent_revision,document,document_hash,created_by,created_at)
    values(mid,wanted,nullif(expected,0),doc,doc_hash,actor,committed_at);
  result := jsonb_build_object('missionId',mid,'revision',wanted,'documentHash',doc_hash,'createdAt',committed_at);
  insert into xedo_private.mutation_receipts(owner_id,mutation_id,request_hash,response) values(actor,mutation,request_hash,result);
  return result;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise sqlstate 'PT422' using message='INVALID_REQUEST';
end $$;

create function public.xedo_inspector(p_action text, p_payload jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path = '' as $$
  select xedo_private.inspector_request(p_action,p_payload);
$$;
revoke all on all functions in schema xedo_private from public, anon, authenticated;
revoke all on function public.xedo_inspector(text,jsonb) from public, anon, authenticated;
grant execute on function xedo_private.inspector_request(text,jsonb) to authenticated;
grant execute on function public.xedo_inspector(text,jsonb) to authenticated;
comment on function public.xedo_inspector(text,jsonb) is 'XEDO Inspector RPC: live session and team provisioning required; no client owner, direct table writes or risk confirmation.';
