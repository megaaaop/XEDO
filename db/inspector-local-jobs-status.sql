-- Reconcile owned expired jobs during Inspector polling, even if PC is offline.
-- Local-tested candidate; latest hosted application status is in docs/XEDO_WORK_LOG.md.
-- Apply after inspector-local-jobs.sql; additive and repeatable, no accounts/resources.
do $local_status_install$
declare installed boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('xedo:local-ai-schema-install',0));
 if to_regclass('xedo_private.local_cpu_schema_versions') is null then raise exception 'Local CPU jobs v1 is required';end if;
 select exists(select 1 from xedo_private.local_cpu_schema_versions where version='xedo-local-cpu-jobs/1') into installed;
 if not installed then raise exception 'Local CPU jobs v1 is required';end if;
 if exists(select 1 from xedo_private.local_cpu_schema_versions where version='xedo-local-cpu-status/2') then return;end if;
 execute $local_status_ddl$
create or replace function xedo_private.local_job_view(j xedo_private.analysis_jobs) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('jobId',j.id,'missionId',j.mission_id,'inputRevision',j.input_revision,
 'geometry',j.spec->'geometry','start',j.spec->'start','end',j.spec->'end','status',j.status,'stage',j.stage,
 'attempt',j.attempt,'processedTiles',j.processed_tiles,'totalTiles',j.total_tiles,'resultId',j.result_id,
 'deadlineAt',j.deadline_at,'leaseExpiresAt',j.lease_expires_at,'workerOnline',presence.online,'workerLastSeenAt',presence.last_seen_at,
 'cancelRequested',j.cancel_requested,'createdAt',j.created_at,'updatedAt',j.updated_at,
 'errorCode',j.error_code,'errorMessage',j.error_message)
 from (select coalesce(bool_or(w.enabled and w.last_seen_at>now()-interval '180 seconds'),false) online,max(w.last_seen_at) last_seen_at
 from xedo_private.local_worker_registry w where w.owner_id=j.owner_id and (j.worker_id is null or w.worker_id=j.worker_id)) presence;
$$;
create or replace function xedo_private.local_inspector_jobs(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid;mid uuid;wanted integer;mutation uuid;request_hash text;j xedo_private.analysis_jobs%rowtype;doc jsonb;spec jsonb;first_day date;last_day date;min_lng double precision;max_lng double precision;min_lat double precision;max_lat double precision;bbox_width double precision;bbox_height double precision;
begin
 perform pg_advisory_xact_lock(hashtextextended('session:'||coalesce(auth.jwt()->>'session_id','missing'),0));
 actor:=xedo_private.require_inspector();
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>16384 then raise sqlstate 'PT422' using message='INVALID_JOB_REQUEST';end if;
 if p_action='worker_status' then
  return (select jsonb_build_object('online',coalesce(bool_or(enabled and last_seen_at>now()-interval '180 seconds'),false),'lastSeenAt',max(last_seen_at)) from xedo_private.local_worker_registry where owner_id=actor);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('xedo:local-ai-queue',0));
 -- Owner reads reconcile hard deadline/cancelled expired lease without relying on
 -- a worker being alive. A recoverable expired lease is left for claim/fence logic.
 if p_action in ('job','jobs','cancel_job') then
  update xedo_private.analysis_attempts a set finished_at=now(),outcome=case when expired_job.cancel_requested then 'cancelled' else 'failed' end
  from xedo_private.analysis_jobs expired_job
  where a.id=expired_job.attempt_id and a.finished_at is null and expired_job.owner_id=actor and expired_job.status in ('queued','running')
   and (expired_job.deadline_at<=now() or (expired_job.status='running' and expired_job.cancel_requested and expired_job.lease_expires_at<=now()));
  update xedo_private.analysis_jobs set status=case when cancel_requested then 'cancelled' else 'failed' end,
   stage=case when cancel_requested then 'cancelled' else 'failed' end,
   error_code=case when cancel_requested then 'worker_cancelled' else 'worker_timeout' end,error_message=null,lease_expires_at=null,updated_at=now()
  where owner_id=actor and status in ('queued','running')
   and (deadline_at<=now() or (status='running' and cancel_requested and lease_expires_at<=now()));
 end if;
 if p_action='jobs' then return jsonb_build_object('jobs',(select coalesce(jsonb_agg(xedo_private.local_job_view(q) order by q.created_at desc),'[]') from (select * from xedo_private.analysis_jobs where owner_id=actor order by created_at desc,id limit 30) q));end if;
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

-- CREATE OR REPLACE preserves ACLs, but restate the intended entrypoint boundary.
revoke all on function xedo_private.local_job_view(xedo_private.analysis_jobs),xedo_private.local_inspector_jobs(text,jsonb) from public,anon,authenticated;
insert into xedo_private.local_cpu_schema_versions(version) values('xedo-local-cpu-status/2');
$local_status_ddl$;
end $local_status_install$;
