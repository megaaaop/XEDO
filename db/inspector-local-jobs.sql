-- Local-tested additive CPU queue/results candidate. Apply after inspector-ai.sql.
-- Initial local candidate; latest hosted application status is in docs/XEDO_WORK_LOG.md.
-- Creates no Auth accounts, Storage buckets, Billing links or subscription.
-- One atomic install; versioned reapplication is a no-op, not a second wrapper.
do $local_install$
declare installed boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('xedo:local-ai-schema-install',0));
 if to_regclass('xedo_private.local_cpu_schema_versions') is not null then
  execute 'select exists(select 1 from xedo_private.local_cpu_schema_versions where version=$1)' into installed using 'xedo-local-cpu-jobs/1';
  if installed then return;end if;
 end if;
 if to_regclass('xedo_private.analysis_jobs') is not null
 or to_regprocedure('xedo_private.inspector_request_before_local_jobs(text,jsonb)') is not null
 then raise exception 'Partial unversioned local CPU schema; inspect before applying';end if;
 execute $local_ddl$
create table xedo_private.local_cpu_schema_versions(version text primary key, applied_at timestamptz not null default now());
alter table xedo_private.local_cpu_schema_versions enable row level security;
revoke all on xedo_private.local_cpu_schema_versions from public,anon,authenticated;
create table xedo_private.local_worker_registry (
 worker_id uuid primary key references auth.users(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 last_seen_at timestamptz,
 created_at timestamptz not null default now(),
 check(worker_id<>owner_id)
);
create table xedo_private.analysis_jobs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 mission_id uuid not null references xedo_private.mission_heads(id) on delete cascade,
 input_revision integer not null,
 mutation_id uuid not null,
 request_hash text not null,
 spec jsonb not null,
 status text not null default 'queued' check(status in ('queued','running','succeeded','failed','cancelled')),
 stage text not null default 'queued',
 attempt integer not null default 0,
 fence bigint not null default 0,
 worker_id uuid references auth.users(id),
 attempt_id uuid,
 lease_expires_at timestamptz,
 deadline_at timestamptz not null default now()+interval '30 minutes',
 cancel_requested boolean not null default false,
 processed_tiles integer not null default 0,
 total_tiles integer,
 result_id text,
 error_code text,
 error_message text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,mutation_id),
 foreign key(mission_id,input_revision) references xedo_private.mission_revisions(mission_id,revision)
);
create index analysis_jobs_owner_created on xedo_private.analysis_jobs(owner_id,created_at desc,id);
create index analysis_jobs_status_created on xedo_private.analysis_jobs(status,created_at,id);
create table xedo_private.analysis_attempts (
 id uuid primary key,
 job_id uuid not null references xedo_private.analysis_jobs(id) on delete cascade,
 worker_id uuid not null references auth.users(id),
 fence bigint not null,
 started_at timestamptz not null default now(),
 heartbeat_at timestamptz not null default now(),
 finished_at timestamptz,
 outcome text,
 unique(job_id,fence)
);
create table xedo_private.owned_analysis_results (
 result_id text primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid not null unique references xedo_private.analysis_jobs(id) on delete cascade,
 attempt_id uuid not null references xedo_private.analysis_attempts(id),
 payload jsonb not null,
 created_at timestamptz not null default now()
);
create table xedo_private.analysis_publish_receipts (
 job_id uuid not null references xedo_private.analysis_jobs(id) on delete cascade,
 mutation_id uuid not null,
 worker_id uuid not null references auth.users(id),
 attempt_id uuid not null,
 fence bigint not null,
 request_hash text not null,
 response jsonb not null,
 primary key(job_id,mutation_id)
);
alter table xedo_private.local_worker_registry enable row level security;
alter table xedo_private.analysis_jobs enable row level security;
alter table xedo_private.analysis_attempts enable row level security;
alter table xedo_private.owned_analysis_results enable row level security;
alter table xedo_private.analysis_publish_receipts enable row level security;
revoke all on xedo_private.local_worker_registry,xedo_private.analysis_jobs,xedo_private.analysis_attempts,xedo_private.owned_analysis_results,xedo_private.analysis_publish_receipts from public,anon,authenticated;

create function xedo_private.local_job_view(j xedo_private.analysis_jobs) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('jobId',j.id,'missionId',j.mission_id,'inputRevision',j.input_revision,
 'geometry',j.spec->'geometry','start',j.spec->'start','end',j.spec->'end','status',j.status,'stage',j.stage,
 'attempt',j.attempt,'processedTiles',j.processed_tiles,'totalTiles',j.total_tiles,'resultId',j.result_id,
 'cancelRequested',j.cancel_requested,'createdAt',j.created_at,'updatedAt',j.updated_at,
 'errorCode',j.error_code,'errorMessage',j.error_message);
$$;

create function xedo_private.local_require_worker() returns xedo_private.local_worker_registry
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();sid uuid:=(auth.jwt()->>'session_id')::uuid;r xedo_private.local_worker_registry%rowtype;
begin
 if actor is null or sid is null or coalesce((auth.jwt()->>'exp')::bigint,0)<=extract(epoch from now())
 or not exists(select 1 from auth.sessions s where s.id=sid and s.user_id=actor and (s.not_after is null or s.not_after>now()))
 or exists(select 1 from xedo_private.revoked_sessions s where s.session_id=sid)
 then raise sqlstate 'PT401' using message='WORKER_SESSION_REQUIRED'; end if;
 select * into r from xedo_private.local_worker_registry where worker_id=actor and enabled;
 if not found or exists(select 1 from xedo_private.inspector_accounts where user_id=actor)
 or not exists(select 1 from xedo_private.inspector_accounts where user_id=r.owner_id and enabled)
 then raise sqlstate 'PT403' using message='WORKER_NOT_PROVISIONED'; end if;
 return r;
end $$;

-- Bounded raw polygon validation, distinct from the120-point planning target.
create function xedo_private.local_ring_valid(r jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare n integer;i integer;j integer;p jsonb;xs double precision[]:=array[]::double precision[];ys double precision[]:=array[]::double precision[];
 a double precision;b double precision;c double precision;d double precision;area2 double precision:=0;
begin
 if jsonb_typeof(r) is distinct from 'array' then return false;end if;n:=jsonb_array_length(r);
 if n<4 or n>4097 or r->0 is distinct from r->(n-1) then return false;end if;
 for p in select value from jsonb_array_elements(r) loop
  if jsonb_typeof(p) is distinct from 'array' or jsonb_array_length(p)<>2 or jsonb_typeof(p->0) is distinct from 'number' or jsonb_typeof(p->1) is distinct from 'number' then return false;end if;
  a:=(p->>0)::double precision;b:=(p->>1)::double precision;if abs(a)>180 or abs(b)>85 then return false;end if;
  xs:=array_append(xs,a);ys:=array_append(ys,b);
 end loop;
 if (select count(distinct value) from jsonb_array_elements(r) with ordinality a(value,ord) where ord<n)<>n-1 then return false;end if;
 for i in 1..n-1 loop
  if xs[i]=xs[i+1] and ys[i]=ys[i+1] then return false;end if;
  area2:=area2+(xs[i]-xs[1])*(ys[i+1]-ys[1])-(xs[i+1]-xs[1])*(ys[i]-ys[1]);
  if i<n-2 then for j in i+2..n-1 loop
   if i=1 and j=n-1 then continue;end if;
   if greatest(xs[i],xs[i+1])+1e-12<least(xs[j],xs[j+1]) or greatest(xs[j],xs[j+1])+1e-12<least(xs[i],xs[i+1])
   or greatest(ys[i],ys[i+1])+1e-12<least(ys[j],ys[j+1]) or greatest(ys[j],ys[j+1])+1e-12<least(ys[i],ys[i+1]) then continue;end if;
   a:=(xs[i+1]-xs[i])*(ys[j]-ys[i])-(ys[i+1]-ys[i])*(xs[j]-xs[i]);
   b:=(xs[i+1]-xs[i])*(ys[j+1]-ys[i])-(ys[i+1]-ys[i])*(xs[j+1]-xs[i]);
   c:=(xs[j+1]-xs[j])*(ys[i]-ys[j])-(ys[j+1]-ys[j])*(xs[i]-xs[j]);
   d:=(xs[j+1]-xs[j])*(ys[i+1]-ys[j])-(ys[j+1]-ys[j])*(xs[i+1]-xs[j]);
   if (a*b<0 and c*d<0)
   or (abs(a)<1e-16 and xs[j] between least(xs[i],xs[i+1])-1e-12 and greatest(xs[i],xs[i+1])+1e-12 and ys[j] between least(ys[i],ys[i+1])-1e-12 and greatest(ys[i],ys[i+1])+1e-12)
   or (abs(b)<1e-16 and xs[j+1] between least(xs[i],xs[i+1])-1e-12 and greatest(xs[i],xs[i+1])+1e-12 and ys[j+1] between least(ys[i],ys[i+1])-1e-12 and greatest(ys[i],ys[i+1])+1e-12)
   or (abs(c)<1e-16 and xs[i] between least(xs[j],xs[j+1])-1e-12 and greatest(xs[j],xs[j+1])+1e-12 and ys[i] between least(ys[j],ys[j+1])-1e-12 and greatest(ys[j],ys[j+1])+1e-12)
   or (abs(d)<1e-16 and xs[i+1] between least(xs[j],xs[j+1])-1e-12 and greatest(xs[j],xs[j+1])+1e-12 and ys[i+1] between least(ys[j],ys[j+1])-1e-12 and greatest(ys[j],ys[j+1])+1e-12)
   then return false;end if;
  end loop;end if;
 end loop;
 return abs(area2)>1e-16;
exception when others then return false;
end $$;

create function xedo_private.local_rings_touch(a jsonb,b jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare i integer;j integer;p jsonb;q jsonb;r jsonb;s jsonb;x1 double precision;x2 double precision;x3 double precision;x4 double precision;
begin
 for i in 0..jsonb_array_length(a)-2 loop p:=a->i;q:=a->(i+1);
  for j in 0..jsonb_array_length(b)-2 loop r:=b->j;s:=b->(j+1);
   if greatest((p->>0)::double precision,(q->>0)::double precision)+1e-12<least((r->>0)::double precision,(s->>0)::double precision)
   or greatest((r->>0)::double precision,(s->>0)::double precision)+1e-12<least((p->>0)::double precision,(q->>0)::double precision)
   or greatest((p->>1)::double precision,(q->>1)::double precision)+1e-12<least((r->>1)::double precision,(s->>1)::double precision)
   or greatest((r->>1)::double precision,(s->>1)::double precision)+1e-12<least((p->>1)::double precision,(q->>1)::double precision) then continue;end if;
   x1:=xedo_private.risk_cross(p,q,r);x2:=xedo_private.risk_cross(p,q,s);x3:=xedo_private.risk_cross(r,s,p);x4:=xedo_private.risk_cross(r,s,q);
   if (x1*x2<0 and x3*x4<0) or xedo_private.risk_on_segment(p,q,r) or xedo_private.risk_on_segment(p,q,s) or xedo_private.risk_on_segment(r,s,p) or xedo_private.risk_on_segment(r,s,q) then return true;end if;
  end loop;
 end loop;return false;
end $$;

create function xedo_private.local_geometry_vertices(g jsonb) returns integer
language plpgsql immutable set search_path='' as $$
declare rings jsonb;r jsonb;i integer;j integer;total integer:=0;
begin
 if jsonb_typeof(g) is distinct from 'object' or g->>'type' is distinct from 'Polygon' then return -1;end if;
 rings:=g->'coordinates';if jsonb_typeof(rings) is distinct from 'array' or jsonb_array_length(rings) not between 1 and 64 then return -1;end if;
 for r in select value from jsonb_array_elements(rings) loop
  if not xedo_private.local_ring_valid(r) then return -1;end if;total:=total+jsonb_array_length(r);if total>8192 then return -1;end if;
 end loop;
 for i in 1..jsonb_array_length(rings)-1 loop
  if not xedo_private.risk_point_ring(rings->i->0,rings->0,false) or xedo_private.local_rings_touch(rings->0,rings->i) then return -1;end if;
  if i>1 then for j in 1..i-1 loop
   if xedo_private.local_rings_touch(rings->i,rings->j) or xedo_private.risk_point_ring(rings->i->0,rings->j,true) or xedo_private.risk_point_ring(rings->j->0,rings->i,true) then return -1;end if;
  end loop;end if;
 end loop;return total;
exception when others then return -1;
end $$;

create function xedo_private.local_seal_result(analysis jsonb,j xedo_private.analysis_jobs) returns jsonb
language plpgsql set search_path='' as $$
declare candidates jsonb;coverage jsonb;f jsonb;geom jsonb;props jsonb;manifest jsonb;catalog jsonb;ref jsonb;rid text;model jsonb;limitations jsonb;
 total_vertices integer:=0;n integer;w integer;h integer;a double precision;b double precision;c double precision;d double precision;e double precision;ff double precision;
 pixel_area double precision;counts jsonb;candidate_pixels bigint:=0;valid_pixels bigint:=0;nodata_pixels bigint:=0;role text;acquired timestamptz;
begin
 if jsonb_typeof(analysis) is distinct from 'object' or octet_length(analysis::text)>524288
 or exists(select 1 from jsonb_object_keys(analysis) k where k not in ('schemaVersion','kind','resultId','reviewStatus','accuracyValidatedOnGEE','serverRegistered','acquiredAt','inferredAt','searchGeometry','source','model','grid','coverageSummary','candidates','coverage','footprint','manifest','threshold','thresholdComparison','limitations'))
 or not (analysis ?& array['schemaVersion','kind','searchGeometry','source','model','grid','coverageSummary','candidates','coverage','footprint','manifest','acquiredAt','inferredAt','threshold','thresholdComparison'])
 or not (analysis->'source' ?& array['collectionId','assetId','sceneId','acquiredAt'])
 or not (analysis->'grid' ?& array['width','height','crs','transform'])
 or analysis->>'schemaVersion' is distinct from 'xedo-local-analysis/1' or analysis->>'kind' is distinct from 'local_sar'
 or analysis->'searchGeometry' is distinct from j.spec->'geometry'
 or analysis->'model'->>'checkpointSha256' is distinct from '41a2bd4b5b2382b17d3ad2d2ebce38b09d011f2e15dacd59e4ce46c032cfd46b'
 or analysis->'model'->>'architecture' is distinct from 'SARUNet' or analysis->'model'->'inputBands' is distinct from '["VH","VV"]'::jsonb
 or analysis->'model'->>'inputUnits' is distinct from 'Sigma0_dB' or analysis->'model'->'calibrated' is distinct from 'false'::jsonb
 or analysis->'model'->>'preprocessingVersion' is distinct from 'xedo-local-sar/1' or analysis->'threshold' is distinct from '0.3'::jsonb
 or analysis->>'thresholdComparison' is distinct from '>=' or analysis->'source'->>'collectionId' is distinct from 'COPERNICUS/S1_GRD'
 or (analysis->'source'->>'assetId') !~ '^COPERNICUS/S1_GRD/[A-Za-z0-9_]+$'
 or analysis->'source'->>'assetId' is distinct from 'COPERNICUS/S1_GRD/'||(analysis->'source'->>'sceneId')
 or analysis->'acquiredAt' is distinct from analysis->'source'->'acquiredAt'
 or analysis->'manifest'->'source' is distinct from analysis->'source'
 or analysis->'manifest'->'model' is distinct from analysis->'model'
 or analysis->'manifest'->'grid' is distinct from analysis->'grid'
 or analysis->'manifest'->'inferredAt' is distinct from analysis->'inferredAt'
 then raise sqlstate 'PT422' using message='ANALYSIS_CONTRACT_INVALID';end if;
 acquired:=(analysis->'source'->>'acquiredAt')::timestamptz;
 if acquired is null or not isfinite(acquired) or acquired<(j.spec->>'start')::date::timestamptz or acquired>=((j.spec->>'end')::date+1)::timestamptz then raise sqlstate 'PT422' using message='SOURCE_DATE_INVALID';end if;
 if analysis->>'inferredAt' is null or not isfinite((analysis->>'inferredAt')::timestamptz) or (analysis->>'inferredAt')::timestamptz<acquired or (analysis->>'inferredAt')::timestamptz>now()+interval '5 minutes' then raise sqlstate 'PT422' using message='INFERENCE_DATE_INVALID';end if;
 w:=(analysis->'grid'->>'width')::integer;h:=(analysis->'grid'->>'height')::integer;
 geom:=analysis->'grid'->'transform';
 if w is null or h is null or w not between 1 and 4096 or h not between 1 and 4096 or w::bigint*h>2000000
 or jsonb_typeof(geom) is distinct from 'array' or jsonb_array_length(geom)<>6
 or exists(select 1 from jsonb_array_elements(geom) v where jsonb_typeof(v)<>'number')
 or (analysis->'grid'->>'crs') !~ '^EPSG:32[67][0-9]{2}$' or right(analysis->'grid'->>'crs',2)::integer not between 1 and 60
 then raise sqlstate 'PT422' using message='ANALYSIS_GRID_INVALID';end if;
 a:=(geom->>0)::double precision;b:=(geom->>1)::double precision;c:=(geom->>2)::double precision;d:=(geom->>3)::double precision;e:=(geom->>4)::double precision;ff:=(geom->>5)::double precision;
 pixel_area:=abs(a*e-b*d);
 if abs(a*a+d*d-100)>1e-6 or abs(b*b+e*e-100)>1e-6 or abs(a*b+d*e)>1e-6 or abs(c)>1e9 or abs(ff)>1e9 or w::bigint*h*pixel_area>200000000.001 then raise sqlstate 'PT422' using message='ANALYSIS_GRID_INVALID';end if;
 counts:=analysis->'coverageSummary'->'pixelCounts';
 if jsonb_typeof(counts) is distinct from 'object' or not (counts ?& array['total','valid','candidate','background','nodata'])
 or exists(select 1 from jsonb_each(counts) p where jsonb_typeof(p.value)<>'number')
 or analysis->'manifest'->'pixelCounts' is distinct from counts
 or (counts->>'total')::bigint is distinct from w::bigint*h or (counts->>'valid')::bigint not between 1 and w::bigint*h
 or (counts->>'candidate')::bigint not between 0 and (counts->>'valid')::bigint
 or (counts->>'background')::bigint is distinct from (counts->>'valid')::bigint-(counts->>'candidate')::bigint
 or (counts->>'nodata')::bigint is distinct from w::bigint*h-(counts->>'valid')::bigint then raise sqlstate 'PT422' using message='ANALYSIS_COUNTS_INVALID';end if;
 candidates:=analysis->'candidates';coverage:=analysis->'coverage';
 if candidates->>'type' is distinct from 'FeatureCollection' or jsonb_typeof(candidates->'features') is distinct from 'array' or jsonb_array_length(candidates->'features')>256
 or coverage->>'type' is distinct from 'FeatureCollection' or jsonb_typeof(coverage->'features') is distinct from 'array' or jsonb_array_length(coverage->'features')>256
 or jsonb_array_length(candidates->'features')+jsonb_array_length(coverage->'features')>256
 or not xedo_private.risk_valid_target(analysis->'footprint') or not xedo_private.risk_geometry_covers(analysis->'footprint',j.spec->'geometry')
 then raise sqlstate 'PT422' using message='ANALYSIS_GEOMETRY_INVALID';end if;
 if (select count(distinct v->>'id') from jsonb_array_elements(candidates->'features') v)<>jsonb_array_length(candidates->'features') then raise sqlstate 'PT422' using message='CANDIDATE_IDS_INVALID';end if;
 for f in select value from jsonb_array_elements(candidates->'features') loop
  props:=f->'properties';n:=xedo_private.local_geometry_vertices(f->'geometry');total_vertices:=total_vertices+n;
  if f->>'type' is distinct from 'Feature' or not (props ?& array['candidateId','pixelCount','areaProjectedM2','areaCrs','classification','reviewStatus','threshold']) or (f->>'id') !~ '^[A-Za-z0-9_-]{1,120}$' or props->>'candidateId' is distinct from f->>'id'
  or n<0 or total_vertices>8192 or jsonb_typeof(props->'pixelCount') is distinct from 'number' or jsonb_typeof(props->'areaProjectedM2') is distinct from 'number' or (props->>'pixelCount')::bigint not between 1 and w::bigint*h
  or props->>'classification' is distinct from 'analysis_candidate' or props->>'reviewStatus' is distinct from 'unreviewed'
  or (props->>'threshold')::double precision is distinct from 0.3::double precision
  or props->>'areaCrs' is distinct from analysis->'grid'->>'crs'
  or abs((props->>'areaProjectedM2')::double precision-(props->>'pixelCount')::bigint*pixel_area)>.01
  then raise sqlstate 'PT422' using message='CANDIDATE_GEOMETRY_INVALID';end if;
  candidate_pixels:=candidate_pixels+(props->>'pixelCount')::bigint;
 end loop;
 for f in select value from jsonb_array_elements(coverage->'features') loop
  props:=f->'properties';role:=props->>'role';n:=xedo_private.local_geometry_vertices(f->'geometry');total_vertices:=total_vertices+n;
  if f->>'type' is distinct from 'Feature' or not (props ?& array['role','pixelCount','areaProjectedM2','areaCrs']) or coalesce(role,'') not in ('valid_data','nodata_within_output_grid') or n<0 or total_vertices>8192
  or jsonb_typeof(props->'pixelCount') is distinct from 'number' or jsonb_typeof(props->'areaProjectedM2') is distinct from 'number'
  or (props->>'pixelCount')::bigint not between 1 and w::bigint*h or props->>'areaCrs' is distinct from analysis->'grid'->>'crs'
  or abs((props->>'areaProjectedM2')::double precision-(props->>'pixelCount')::bigint*pixel_area)>.01 then raise sqlstate 'PT422' using message='COVERAGE_GEOMETRY_INVALID';end if;
  if role='valid_data' then valid_pixels:=valid_pixels+(props->>'pixelCount')::bigint;else nodata_pixels:=nodata_pixels+(props->>'pixelCount')::bigint;end if;
 end loop;
 if candidate_pixels is distinct from (counts->>'candidate')::bigint or valid_pixels is distinct from (counts->>'valid')::bigint or nodata_pixels is distinct from (counts->>'nodata')::bigint then raise sqlstate 'PT422' using message='GEOMETRY_COUNTS_INVALID';end if;
 rid:='XEDO_LOCAL_RESULT_'||replace(gen_random_uuid()::text,'-','');
 model:=jsonb_build_object('architecture','SARUNet','version',null,'checkpointSha256','41a2bd4b5b2382b17d3ad2d2ebce38b09d011f2e15dacd59e4ce46c032cfd46b','inputBands',jsonb_build_array('VH','VV'),'inputUnits','Sigma0_dB','calibrated',false,'preprocessingVersion','xedo-local-sar/1','scoreSemantics','sigmoid output, not calibrated probability');
 limitations:=jsonb_build_array('GEE-to-training preprocessing compatibility and field accuracy are not established.','Model scores are uncalibrated outputs, not confirmed oil or thickness/volume.','Land and SAR lookalikes are not excluded.','NoData is insufficient information, not an absence of oil.','Inspector review and separate flight readiness are required.');
 select jsonb_build_object('type','FeatureCollection','features',coalesce(jsonb_agg(jsonb_set(raw_feature,'{properties,resultId}',to_jsonb(rid))),'[]')) into candidates from jsonb_array_elements(candidates->'features') raw_feature;
 manifest:=jsonb_build_object('schemaVersion','xedo-owned-analysis-manifest/1','sealVersion','xedo-jsonb-seal/1','resultId',rid,'jobId',j.id,'inputRevision',j.input_revision,
 'source',analysis->'source','model',model,'grid',analysis->'grid','pixelCounts',counts,'threshold',jsonb_build_object('value',0.3,'comparison','>='),'knownLimitations',limitations,
 'producerRunId',analysis->'resultId','producerManifest',analysis->'manifest','hashAuthority','catalog seals derived by database; local file hashes are producer-reported',
 'resultKind','owned_on_demand_sar','accuracyValidatedOnGEE',false);
 ref:=jsonb_build_object('resultId',rid,'manifestSha256',encode(sha256(convert_to(manifest::text,'UTF8')),'hex'),
 'candidatesSha256',encode(sha256(convert_to(candidates::text,'UTF8')),'hex'),'coverageSha256',encode(sha256(convert_to(coverage::text,'UTF8')),'hex'));
 catalog:=(analysis-'manifest'-'analysisRef'-'serverRegistered')||jsonb_build_object('schemaVersion','xedo-prepared-analysis/1','resultId',rid,'kind','owned_sar',
 'title','Sentinel-1 SAR analysis','reviewStatus','unreviewed','model',model,'limitations',limitations,'analysisRef',ref,'candidates',candidates,'coverage',coverage,'manifest',manifest,'inferenceStartedAt',analysis->'manifest'->'inferenceStartedAt',
 'artifactHashes',analysis->'manifest'->'artifactHashes','accuracyValidatedOnGEE',false,'serverRegistered',true);
 if octet_length(catalog::text)>600000 then raise sqlstate 'PT422' using message='RESULT_TOO_COMPLEX';end if;
 return catalog;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_datetime_format or datetime_field_overflow then raise sqlstate 'PT422' using message='ANALYSIS_CONTRACT_INVALID';
end $$;

create function xedo_private.local_inspector_jobs(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid;mid uuid;wanted integer;mutation uuid;request_hash text;j xedo_private.analysis_jobs%rowtype;doc jsonb;spec jsonb;first_day date;last_day date;min_lng double precision;max_lng double precision;min_lat double precision;max_lat double precision;bbox_width double precision;bbox_height double precision;
begin
 perform pg_advisory_xact_lock(hashtextextended('session:'||coalesce(auth.jwt()->>'session_id','missing'),0));
 actor:=xedo_private.require_inspector();
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>16384 then raise sqlstate 'PT422' using message='INVALID_JOB_REQUEST';end if;
 if p_action='worker_status' then
  return (select jsonb_build_object('online',coalesce(bool_or(enabled and last_seen_at>now()-interval '180 seconds'),false),'lastSeenAt',max(last_seen_at)) from xedo_private.local_worker_registry where owner_id=actor);
 end if;
 if p_action='jobs' then return jsonb_build_object('jobs',(select coalesce(jsonb_agg(xedo_private.local_job_view(q) order by q.created_at desc),'[]') from (select * from xedo_private.analysis_jobs where owner_id=actor order by created_at desc,id limit 30) q));end if;
 perform pg_advisory_xact_lock(hashtextextended('xedo:local-ai-queue',0));
 if p_action in ('job','cancel_job') then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k<>'jobId') then raise sqlstate 'PT422' using message='INVALID_JOB_REQUEST';end if;
  select * into j from xedo_private.analysis_jobs where id=(p_payload->>'jobId')::uuid and owner_id=actor for update;
  if not found then raise sqlstate 'PT404' using message='JOB_NOT_FOUND';end if;
  if p_action='cancel_job' and j.status in ('queued','running') then
   update xedo_private.analysis_jobs set cancel_requested=true,status=case when status='queued' then 'cancelled' else status end,
   stage=case when status='queued' then 'cancelled' else 'cancelling' end,updated_at=now() where id=j.id returning * into j;
  end if;return xedo_private.local_job_view(j);
 end if;
 if p_action<>'create_job' or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('missionId','expectedRevision','mutationId','start','end')) then raise sqlstate 'PT422' using message='INVALID_JOB_REQUEST';end if;
 mutation:=(p_payload->>'mutationId')::uuid;mid:=(p_payload->>'missionId')::uuid;wanted:=(p_payload->>'expectedRevision')::integer;
 if mutation is null or mid is null or wanted is null or wanted<1 then raise sqlstate 'PT422' using message='INVALID_JOB_REQUEST';end if;
 request_hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
 select * into j from xedo_private.analysis_jobs where owner_id=actor and mutation_id=mutation;
 if found then if j.request_hash<>request_hash then raise sqlstate 'PT409' using message='MUTATION_REUSED';end if;return xedo_private.local_job_view(j);end if;
 if not exists(select 1 from xedo_private.local_worker_registry where owner_id=actor and enabled and last_seen_at>now()-interval '180 seconds') then raise sqlstate 'PT503' using message='WORKER_OFFLINE';end if;
 select r.document into doc from xedo_private.mission_heads h join xedo_private.mission_revisions r on r.mission_id=h.id and r.revision=h.current_revision where h.id=mid and h.owner_id=actor and h.current_revision=wanted;
 if doc is null then raise sqlstate 'PT409' using message='MISSION_REVISION_CHANGED';end if;
 if not xedo_private.risk_valid_target(doc->'searchGeometry') or exists(select 1 from jsonb_array_elements(doc->'searchGeometry'->'coordinates'->0) p where (p->>1)::double precision not between -80 and 84) then raise sqlstate 'PT422' using message='JOB_AREA_INVALID';end if;
 select min((p->>0)::double precision),max((p->>0)::double precision),min((p->>1)::double precision),max((p->>1)::double precision) into min_lng,max_lng,min_lat,max_lat from jsonb_array_elements(doc->'searchGeometry'->'coordinates'->0) p;
 bbox_width:=(max_lng-min_lng)*111320*cos((max_lat+min_lat)*pi()/360);bbox_height:=(max_lat-min_lat)*111320;
 -- Conservative early bound; worker still verifies exact native UTM grid<=2M pixels.
 if bbox_width*bbox_height>200000000 or bbox_width>40000 or bbox_height>40000 then raise sqlstate 'PT422' using message='JOB_AREA_INVALID';end if;
 last_day:=coalesce((p_payload->>'end')::date,(now() at time zone 'UTC')::date);first_day:=coalesce((p_payload->>'start')::date,last_day-30);
 if last_day<first_day or last_day-first_day>90 or last_day>(now() at time zone 'UTC')::date then raise sqlstate 'PT422' using message='JOB_DATES_INVALID';end if;
 if (select count(*) from xedo_private.analysis_jobs where owner_id=actor and created_at>=date_trunc('month',now()))>=100 then raise sqlstate 'PT429' using message='MONTHLY_JOB_LIMIT';end if;
 if (select count(*) from xedo_private.analysis_jobs where status='queued')>=2 then raise sqlstate 'PT429' using message='QUEUE_FULL';end if;
 spec:=jsonb_build_object('geometry',doc->'searchGeometry','missionId',mid,'inputRevision',wanted,'start',first_day::text,'end',last_day::text,
 'modelSha256','41a2bd4b5b2382b17d3ad2d2ebce38b09d011f2e15dacd59e4ce46c032cfd46b','recipe','xedo-local-sar/1');
 insert into xedo_private.analysis_jobs(owner_id,mission_id,input_revision,mutation_id,request_hash,spec) values(actor,mid,wanted,mutation,request_hash,spec) returning * into j;
 return xedo_private.local_job_view(j);
exception when invalid_text_representation or numeric_value_out_of_range or invalid_datetime_format or datetime_field_overflow then raise sqlstate 'PT422' using message='INVALID_JOB_REQUEST';
end $$;

create function xedo_private.local_worker_request(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r xedo_private.local_worker_registry%rowtype;j xedo_private.analysis_jobs%rowtype;prior xedo_private.analysis_publish_receipts%rowtype;
 aid uuid;generation bigint;mutation uuid;request_hash text;catalog jsonb;response jsonb;stage_index integer;old_index integer;processed integer;total integer;err text;
 stages text[]:=array['searching','downloading','validating_input','loading_model','inferencing','packaging','publishing'];
begin
 perform pg_advisory_xact_lock(hashtextextended('session:'||coalesce(auth.jwt()->>'session_id','missing'),0));
 r:=xedo_private.local_require_worker();
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>600000 then raise sqlstate 'PT422' using message='INVALID_WORKER_REQUEST';end if;
 if p_action='presence' then
  if p_payload<>'{}'::jsonb then raise sqlstate 'PT422' using message='INVALID_WORKER_REQUEST';end if;
  update xedo_private.local_worker_registry set last_seen_at=now() where worker_id=r.worker_id;
  return jsonb_build_object('online',true,'lastSeenAt',now(),'ownerId',r.owner_id);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('xedo:local-ai-queue',0));
 if p_action='claim' then
  if p_payload<>'{}'::jsonb then raise sqlstate 'PT422' using message='INVALID_WORKER_REQUEST';end if;
  update xedo_private.local_worker_registry set last_seen_at=now() where worker_id=r.worker_id;
  update xedo_private.analysis_attempts a set finished_at=now(),outcome='lease_expired' from xedo_private.analysis_jobs expired_job where a.id=expired_job.attempt_id and expired_job.status='running' and expired_job.lease_expires_at<=now();
  update xedo_private.analysis_jobs set status=case when cancel_requested then 'cancelled' when deadline_at<=now() or attempt>=2 then 'failed' else 'queued' end,
    stage=case when cancel_requested then 'cancelled' when deadline_at<=now() or attempt>=2 then 'failed' else 'queued' end,
    error_code=case when deadline_at<=now() or attempt>=2 then 'worker_timeout' else null end,
    worker_id=null,attempt_id=null,lease_expires_at=null,updated_at=now() where status='running' and lease_expires_at<=now();
  update xedo_private.analysis_jobs set status='failed',stage='failed',error_code='worker_timeout',updated_at=now() where status='queued' and deadline_at<=now();
  if exists(select 1 from xedo_private.analysis_jobs where status='running') then return null;end if;
  select * into j from xedo_private.analysis_jobs where owner_id=r.owner_id and status='queued' and not cancel_requested order by created_at,id for update skip locked limit 1;
  if not found then return null;end if;aid:=gen_random_uuid();
  update xedo_private.analysis_jobs set status='running',stage='searching',worker_id=r.worker_id,attempt_id=aid,attempt=attempt+1,fence=fence+1,lease_expires_at=least(deadline_at,now()+interval '120 seconds'),processed_tiles=0,total_tiles=null,error_code=null,error_message=null,updated_at=now() where id=j.id returning * into j;
  insert into xedo_private.analysis_attempts(id,job_id,worker_id,fence) values(aid,j.id,r.worker_id,j.fence);
  return jsonb_build_object('jobId',j.id,'job',j.spec||jsonb_build_object('jobId',j.id),'attemptId',aid,'fence',j.fence,'leaseExpiresAt',j.lease_expires_at);
 end if;
 if p_action not in ('heartbeat','progress','fail','publish') then raise sqlstate 'PT422' using message='INVALID_WORKER_ACTION';end if;
 select * into j from xedo_private.analysis_jobs where id=(p_payload->>'jobId')::uuid and owner_id=r.owner_id for update;
 if not found then raise sqlstate 'PT404' using message='JOB_NOT_FOUND';end if;
 aid:=(p_payload->>'attemptId')::uuid;generation:=(p_payload->>'fence')::bigint;
 if p_action='publish' then
  mutation:=(p_payload->>'mutationId')::uuid;request_hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
  select * into prior from xedo_private.analysis_publish_receipts where job_id=j.id and mutation_id=mutation;
  if found then
   if prior.worker_id<>r.worker_id or prior.attempt_id is distinct from aid or prior.fence is distinct from generation or prior.request_hash<>request_hash then raise sqlstate 'PT409' using message='PUBLISH_MUTATION_REUSED';end if;
   return prior.response;
  end if;
 end if;
 if j.status<>'running' or j.worker_id is distinct from r.worker_id or j.attempt_id is distinct from aid or j.fence is distinct from generation or j.lease_expires_at<=now() or j.deadline_at<=now() then raise sqlstate 'PT409' using message='LEASE_LOST';end if;
 update xedo_private.local_worker_registry set last_seen_at=now() where worker_id=r.worker_id;
 if p_action='heartbeat' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('jobId','attemptId','fence')) then raise sqlstate 'PT422' using message='INVALID_WORKER_REQUEST';end if;
  update xedo_private.analysis_jobs set lease_expires_at=least(deadline_at,now()+interval '120 seconds'),updated_at=now() where id=j.id returning * into j;
  update xedo_private.analysis_attempts set heartbeat_at=now() where id=aid;
  return jsonb_build_object('cancelRequested',j.cancel_requested,'leaseExpiresAt',j.lease_expires_at);
 end if;
 if p_action='progress' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('jobId','attemptId','fence','stage','processedTiles','totalTiles')) then raise sqlstate 'PT422' using message='INVALID_WORKER_REQUEST';end if;
  if j.cancel_requested then return jsonb_build_object('cancelRequested',true,'leaseExpiresAt',j.lease_expires_at);end if;
  stage_index:=array_position(stages,p_payload->>'stage');old_index:=coalesce(array_position(stages,j.stage),1);
  processed:=coalesce((p_payload->>'processedTiles')::integer,j.processed_tiles);total:=coalesce((p_payload->>'totalTiles')::integer,j.total_tiles);
  if stage_index is null or stage_index<old_index or processed<j.processed_tiles or processed<0 or (total is not null and (total not between 1 and 64 or processed>total))
   or (j.total_tiles is not null and total is distinct from j.total_tiles) then raise sqlstate 'PT422' using message='PROGRESS_INVALID';end if;
  update xedo_private.analysis_jobs set stage=p_payload->>'stage',processed_tiles=processed,total_tiles=total,updated_at=now() where id=j.id;
  return jsonb_build_object('cancelRequested',false,'leaseExpiresAt',j.lease_expires_at);
 end if;
 if p_action='fail' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('jobId','attemptId','fence','errorCode','errorMessage')) then raise sqlstate 'PT422' using message='INVALID_WORKER_REQUEST';end if;
  err:=p_payload->>'errorCode';if err is null or err not in ('worker_timeout','worker_cancelled','lease_lost','pipeline_error','result_invalid','gee_unavailable','result_too_complex','input_invalid') or length(coalesce(p_payload->>'errorMessage',''))>240 then raise sqlstate 'PT422' using message='FAILURE_INVALID';end if;
  update xedo_private.analysis_jobs set status=case when cancel_requested or err='worker_cancelled' then 'cancelled' else 'failed' end,stage=case when cancel_requested or err='worker_cancelled' then 'cancelled' else 'failed' end,error_code=err,error_message=p_payload->>'errorMessage',lease_expires_at=null,updated_at=now() where id=j.id returning * into j;
  update xedo_private.analysis_attempts set outcome=j.status,finished_at=now() where id=aid;
  return jsonb_build_object('jobId',j.id,'status',j.status);
 end if;
 if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('jobId','attemptId','fence','mutationId','analysis')) or mutation is null then raise sqlstate 'PT422' using message='INVALID_PUBLISH_REQUEST';end if;
 if j.cancel_requested then raise sqlstate 'PT409' using message='CANCEL_REQUESTED';end if;
 catalog:=xedo_private.local_seal_result(p_payload->'analysis',j);
 insert into xedo_private.owned_analysis_results(result_id,owner_id,job_id,attempt_id,payload) values(catalog->>'resultId',j.owner_id,j.id,aid,catalog);
 update xedo_private.analysis_jobs set status='succeeded',stage='succeeded',result_id=catalog->>'resultId',lease_expires_at=null,updated_at=now() where id=j.id;
 update xedo_private.analysis_attempts set outcome='succeeded',finished_at=now() where id=aid;
 response:=jsonb_build_object('jobId',j.id,'status','succeeded','resultId',catalog->>'resultId','analysisRef',catalog->'analysisRef');
 insert into xedo_private.analysis_publish_receipts(job_id,mutation_id,worker_id,attempt_id,fence,request_hash,response) values(j.id,mutation,r.worker_id,aid,generation,request_hash,response);
 return response;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_datetime_format or datetime_field_overflow then raise sqlstate 'PT422' using message='INVALID_WORKER_REQUEST';
end $$;

create function xedo_private.resolve_analysis(p_actor uuid,p_result text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_actor is distinct from auth.uid() then raise sqlstate 'PT403' using message='ANALYSIS_OWNER_INVALID';end if;
 select payload into result from xedo_private.prepared_analysis_catalog where result_id=p_result;
 if result is null then select payload into result from xedo_private.owned_analysis_results where result_id=p_result and owner_id=p_actor;end if;
 return result;
end $$;

-- Adapt the existing authoritative routine before wrapping it. Exact guarded
-- replacement aborts if the preceding migration differs; never silently skip.
do $migration$
declare definition text;
begin
 definition:=pg_get_functiondef('xedo_private.inspector_request(text,jsonb)'::regprocedure);
 if position('select payload into catalog from xedo_private.prepared_analysis_catalog where result_id=p_payload->>''resultId'';' in definition)=0
 or position('select payload into catalog from xedo_private.prepared_analysis_catalog where result_id=ref->>''resultId'';' in definition)=0
 then raise exception 'Unexpected inspector_request predecessor; review migration before applying';end if;
 definition:=replace(definition,'select payload into catalog from xedo_private.prepared_analysis_catalog where result_id=p_payload->>''resultId'';','catalog:=xedo_private.resolve_analysis(actor,p_payload->>''resultId'');');
 definition:=replace(definition,'select payload into catalog from xedo_private.prepared_analysis_catalog where result_id=ref->>''resultId'';','catalog:=xedo_private.resolve_analysis(actor,ref->>''resultId'');');
 execute definition;
end $migration$;
alter function xedo_private.inspector_request(text,jsonb) rename to inspector_request_before_local_jobs;
create function xedo_private.inspector_request(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid;result jsonb;
begin
 if p_action in ('create_job','jobs','job','cancel_job','worker_status') then return xedo_private.local_inspector_jobs(p_action,p_payload);end if;
 if p_action='analyses' then
  perform pg_advisory_xact_lock(hashtextextended('session:'||coalesce(auth.jwt()->>'session_id','missing'),0));
  actor:=xedo_private.require_inspector();
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>1100000 then raise sqlstate 'PT422' using message='INVALID_REQUEST';end if;
  return (select coalesce(jsonb_agg(item order by item->>'resultId'),'[]') from (
   select jsonb_build_object('resultId',result_id,'analysisRef',payload->'analysisRef','manifest',payload->'manifest') item from xedo_private.prepared_analysis_catalog
   union all select jsonb_build_object('resultId',result_id,'analysisRef',payload->'analysisRef','manifest',payload->'manifest') from xedo_private.owned_analysis_results where owner_id=actor
  ) q);
 end if;
 return xedo_private.inspector_request_before_local_jobs(p_action,p_payload);
end $$;
create function public.xedo_local_worker(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select xedo_private.local_worker_request(p_action,p_payload);$$;
revoke all on function xedo_private.local_job_view(xedo_private.analysis_jobs),xedo_private.local_require_worker(),xedo_private.local_ring_valid(jsonb),xedo_private.local_rings_touch(jsonb,jsonb),xedo_private.local_geometry_vertices(jsonb),xedo_private.local_seal_result(jsonb,xedo_private.analysis_jobs),xedo_private.local_inspector_jobs(text,jsonb),xedo_private.resolve_analysis(uuid,text),xedo_private.inspector_request_before_local_jobs(text,jsonb),xedo_private.local_worker_request(text,jsonb),xedo_private.inspector_request(text,jsonb),public.xedo_local_worker(text,jsonb) from public,anon,authenticated;
grant execute on function xedo_private.inspector_request(text,jsonb),xedo_private.local_worker_request(text,jsonb),public.xedo_local_worker(text,jsonb) to authenticated;
comment on function public.xedo_local_worker(text,jsonb) is 'Narrow local compute RPC: dedicated live machine identity and enabled owner-bound registry required; no table grants or Inspector role.';

insert into xedo_private.local_cpu_schema_versions(version) values('xedo-local-cpu-jobs/1');
$local_ddl$;
end $local_install$;
