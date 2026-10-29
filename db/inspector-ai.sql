-- XEDO prepared AI and Inspector confirmation, additive to inspector-foundation.sql.
-- No Auth users/accounts/settings are created or changed.
create table xedo_private.prepared_analysis_catalog (
 result_id text primary key,
 payload jsonb not null check (jsonb_typeof(payload)='object' and payload->'analysisRef'->>'resultId'=result_id),
 created_at timestamptz not null default now()
);
alter table xedo_private.prepared_analysis_catalog enable row level security;
revoke all on xedo_private.prepared_analysis_catalog from public,anon,authenticated;
alter table xedo_private.mission_revisions add column confirmed_review jsonb;
-- Bounded WGS84 predicates for the fixed prepared-SAR catalogue. No PostGIS dependency.
-- These predicates validate inspection boundaries and provenance coverage, not flight safety.
create or replace function xedo_private.risk_cross(a jsonb,b jsonb,c jsonb) returns double precision
language sql immutable set search_path='' as $$
 select ((b->>0)::double precision-(a->>0)::double precision)*((c->>1)::double precision-(a->>1)::double precision)
      - ((b->>1)::double precision-(a->>1)::double precision)*((c->>0)::double precision-(a->>0)::double precision);
$$;

create or replace function xedo_private.risk_on_segment(a jsonb,b jsonb,p jsonb) returns boolean
language sql immutable set search_path='' as $$
 select abs(xedo_private.risk_cross(a,b,p))<1e-13
  and (p->>0)::double precision between least((a->>0)::double precision,(b->>0)::double precision)-1e-11 and greatest((a->>0)::double precision,(b->>0)::double precision)+1e-11
  and (p->>1)::double precision between least((a->>1)::double precision,(b->>1)::double precision)-1e-11 and greatest((a->>1)::double precision,(b->>1)::double precision)+1e-11;
$$;

create or replace function xedo_private.risk_point_ring(p jsonb,r jsonb,p_boundary boolean default true) returns boolean
language plpgsql immutable set search_path='' as $$
declare i integer; a jsonb; b jsonb; inside boolean:=false; x double precision:=(p->>0)::double precision; y double precision:=(p->>1)::double precision;
begin
 for i in 0..jsonb_array_length(r)-2 loop
  a:=r->i; b:=r->(i+1);
  if xedo_private.risk_on_segment(a,b,p) then return p_boundary; end if;
  if (((a->>1)::double precision>y)<>((b->>1)::double precision>y)) and
     x<((b->>0)::double precision-(a->>0)::double precision)*(y-(a->>1)::double precision)/((b->>1)::double precision-(a->>1)::double precision)+(a->>0)::double precision
  then inside:=not inside; end if;
 end loop;
 return inside;
end $$;

create or replace function xedo_private.risk_point_geometry(p jsonb,g jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare polys jsonb; poly jsonb; i integer; accepted boolean;
begin
 polys:=case g->>'type' when 'Polygon' then jsonb_build_array(g->'coordinates') when 'MultiPolygon' then g->'coordinates' else '[]'::jsonb end;
 for poly in select value from jsonb_array_elements(polys) loop
  if not xedo_private.risk_point_ring(p,poly->0,true) then continue; end if;
  accepted:=true;
  for i in 1..jsonb_array_length(poly)-1 loop
   -- Hole boundary belongs to the covered polygon; its strict interior does not.
   if xedo_private.risk_point_ring(p,poly->i,false) then accepted:=false; exit; end if;
  end loop;
  if accepted then return true; end if;
 end loop;
 return false;
end $$;

create or replace function xedo_private.risk_valid_target(g jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare r jsonb; p jsonb; n integer; i integer; j integer; a jsonb; b jsonb; c jsonb; d jsonb;
 x double precision; y double precision; cross1 double precision; cross2 double precision; cross3 double precision; cross4 double precision;
 area2 double precision:=0; ox double precision; oy double precision; area_m2 double precision;
begin
 if g is null or jsonb_typeof(g) is distinct from 'object' or g->>'type' is distinct from 'Polygon' or jsonb_typeof(g->'coordinates') is distinct from 'array' or jsonb_array_length(g->'coordinates')<>1 then return false; end if;
 r:=g->'coordinates'->0;
 if jsonb_typeof(r)<>'array' then return false; end if;
 n:=jsonb_array_length(r);
 if n<4 or n>121 or r->0<>r->(n-1) then return false; end if;
 for p in select value from jsonb_array_elements(r) loop
  if jsonb_typeof(p)<>'array' or jsonb_array_length(p)<>2 or jsonb_typeof(p->0)<>'number' or jsonb_typeof(p->1)<>'number' then return false; end if;
  x:=(p->>0)::double precision; y:=(p->>1)::double precision;
  if abs(x)>180 or abs(y)>85 then return false; end if;
 end loop;
 if (select count(distinct value) from jsonb_array_elements(r) with ordinality q(value,ord) where ord<n)<>n-1 then return false; end if;
 for i in 0..n-2 loop
  a:=r->i;b:=r->(i+1);
  if a=b then return false; end if;
  if i<n-3 then
   for j in i+2..n-2 loop
    if i=0 and j=n-2 then continue; end if;
    c:=r->j;d:=r->(j+1);
    cross1:=xedo_private.risk_cross(a,b,c);cross2:=xedo_private.risk_cross(a,b,d);
    cross3:=xedo_private.risk_cross(c,d,a);cross4:=xedo_private.risk_cross(c,d,b);
    if (cross1*cross2<0 and cross3*cross4<0) or xedo_private.risk_on_segment(a,b,c) or xedo_private.risk_on_segment(a,b,d) or xedo_private.risk_on_segment(c,d,a) or xedo_private.risk_on_segment(c,d,b) then return false; end if;
   end loop;
  end if;
 end loop;
 ox:=(r->0->>0)::double precision;oy:=(r->0->>1)::double precision;
 for i in 1..n-2 loop area2:=area2+((r->i->>0)::double precision-ox)*((r->(i+1)->>1)::double precision-oy)-((r->(i+1)->>0)::double precision-ox)*((r->i->>1)::double precision-oy); end loop;
 area_m2:=abs(area2)*0.5*111195.08*111195.08*cos(oy*pi()/180);
 return area_m2>=1 and area_m2<=10000000000;
exception when others then return false;
end $$;

create or replace function xedo_private.risk_geometry_covers(g jsonb,target jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare polygons jsonb; poly jsonb; ring jsonb; r jsonb:=target->'coordinates'->0; i integer; j integer; k integer;
 a jsonb;b jsonb;c jsonb;d jsonb;p jsonb; ax double precision;ay double precision;dx double precision;dy double precision;
 cx double precision;cy double precision;ex double precision;ey double precision;den double precision;t double precision;u double precision;times double precision[];ordered double precision[];v double precision;
begin
 if g is null or target is null or not xedo_private.risk_valid_target(target) then return false; end if;
 polygons:=case g->>'type' when 'Polygon' then jsonb_build_array(g->'coordinates') when 'MultiPolygon' then g->'coordinates' else '[]'::jsonb end;
 if jsonb_array_length(polygons)=0 then return false; end if;
 -- Split each target edge at every boundary intersection. Testing each interval
 -- avoids the vertex-only/bounding-box failure for concave source footprints.
 for i in 0..jsonb_array_length(r)-2 loop
  a:=r->i;b:=r->(i+1);if not xedo_private.risk_point_geometry(a,g) then return false; end if;
  ax:=(a->>0)::double precision;ay:=(a->>1)::double precision;dx:=(b->>0)::double precision-ax;dy:=(b->>1)::double precision-ay;
  times:=array[0::double precision,1::double precision];
  for poly in select value from jsonb_array_elements(polygons) loop
   for ring in select value from jsonb_array_elements(poly) loop
    for j in 0..jsonb_array_length(ring)-2 loop
     c:=ring->j;d:=ring->(j+1);cx:=(c->>0)::double precision-ax;cy:=(c->>1)::double precision-ay;ex:=(d->>0)::double precision-(c->>0)::double precision;ey:=(d->>1)::double precision-(c->>1)::double precision;
     den:=dx*ey-dy*ex;
     if abs(den)>1e-18 then
      t:=(cx*ey-cy*ex)/den;u:=(cx*dy-cy*dx)/den;
      if t>=-1e-10 and t<=1+1e-10 and u>=-1e-10 and u<=1+1e-10 then times:=array_append(times,greatest(0,least(1,t))); end if;
     elsif abs(cx*dy-cy*dx)<1e-13 then
      if abs(dx)>abs(dy) then t:=cx/dx;u:=((d->>0)::double precision-ax)/dx; else t:=cy/dy;u:=((d->>1)::double precision-ay)/dy; end if;
      if t>0 and t<1 then times:=array_append(times,t); end if;
      if u>0 and u<1 then times:=array_append(times,u); end if;
     end if;
    end loop;
   end loop;
  end loop;
  select array_agg(distinct q order by q) into ordered from unnest(times) q;
  for k in 1..array_length(ordered,1)-1 loop
   v:=(ordered[k]+ordered[k+1])/2;p:=jsonb_build_array(ax+v*dx,ay+v*dy);
   if not xedo_private.risk_point_geometry(p,g) then return false; end if;
  end loop;
 end loop;
 -- A source hole can be wholly enclosed by the target without crossing an edge.
 -- Conservatively reject when any hole edge midpoint is strictly inside target.
 for poly in select value from jsonb_array_elements(polygons) loop
  for k in 1..jsonb_array_length(poly)-1 loop
   ring:=poly->k;
   for j in 0..jsonb_array_length(ring)-2 loop
    c:=ring->j;d:=ring->(j+1);p:=jsonb_build_array(((c->>0)::double precision+(d->>0)::double precision)/2,((c->>1)::double precision+(d->>1)::double precision)/2);
    if xedo_private.risk_point_ring(p,r,false) then return false; end if;
    -- If the target coincides with the hole boundary, every midpoint is on its
    -- boundary. A simple polygon has an ear: one consecutive-triple centroid
    -- lies strictly in that hole, which must not be reported as covered data.
    a:=ring->((j+2)%(jsonb_array_length(ring)-1));
    p:=jsonb_build_array(((c->>0)::double precision+(d->>0)::double precision+(a->>0)::double precision)/3,((c->>1)::double precision+(d->>1)::double precision+(a->>1)::double precision)/3);
    if xedo_private.risk_point_ring(p,ring,false) and xedo_private.risk_point_ring(p,r,false) then return false; end if;
   end loop;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;

create or replace function xedo_private.inspector_request(p_action text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid; confirmation jsonb; target jsonb; selected_area jsonb; draft_area jsonb; linked_area jsonb; catalog jsonb; prior_review jsonb; confirmed_review jsonb; latest_review integer; is_confirmation boolean; ref jsonb; decision jsonb; source_id text; raw_candidate jsonb; coverage_state text;
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
  if p_action='analyses' then
    return (select coalesce(jsonb_agg(jsonb_build_object('resultId',result_id,'analysisRef',payload->'analysisRef','manifest',payload->'manifest') order by result_id),'[]') from xedo_private.prepared_analysis_catalog);
  end if;
  if p_action='analysis' then
    select payload into catalog from xedo_private.prepared_analysis_catalog where result_id=p_payload->>'resultId';
    if catalog is null then raise sqlstate 'PT404' using message='ANALYSIS_NOT_FOUND'; end if;
    return catalog;
  end if;
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
        select jsonb_build_object('revision',r.revision,'createdAt',r.created_at,'documentHash',r.document_hash,'reviewRevision',r.confirmed_review->'reviewRevision') item
        from xedo_private.mission_revisions r where r.mission_id=mid order by r.revision desc limit 50 offset offset_n
      ) t; return result;
    end if;
    wanted := coalesce((p_payload->>'revision')::integer,head.current_revision);
    select jsonb_build_object('missionId',mid,'revision',r.revision,'currentRevision',head.current_revision,'document',r.document,'documentHash',r.document_hash,'createdAt',r.created_at,'confirmedReview',r.confirmed_review,'latestReviewRevision',(select max((z.confirmed_review->>'reviewRevision')::integer) from xedo_private.mission_revisions z where z.mission_id=mid and z.revision<=wanted and z.confirmed_review is not null))
      into result from xedo_private.mission_revisions r where r.mission_id=mid and r.revision=wanted;
    if result is null then raise sqlstate 'PT404' using message='MISSION_NOT_FOUND'; end if;
    return result;
  end if;
  if p_action is distinct from 'save' or p_payload->>'schemaVersion' is distinct from 'xedo-inspector-save/1'
    or coalesce(p_payload->>'intent','') not in ('save_draft','confirm_risk')
    or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('schemaVersion','missionId','expectedRevision','mutationId','intent','document','confirmation'))
  then raise sqlstate 'PT422' using message='DRAFT_SAVE_REQUIRED'; end if;
  is_confirmation:=p_payload->>'intent'='confirm_risk';
  if is_confirmation<>(p_payload ? 'confirmation') then raise sqlstate 'PT422' using message='CONFIRMATION_REQUIRED'; end if;
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
  -- Validate against the immutable trusted catalogue, never a browser-supplied seal.
  ref:=doc->'analysisRef';
  if ref is not null and ref<>'null'::jsonb then
    select payload into catalog from xedo_private.prepared_analysis_catalog where result_id=ref->>'resultId';
    if catalog is null or catalog->'analysisRef'<>ref then raise sqlstate 'PT422' using message='ANALYSIS_REFERENCE_INVALID'; end if;
  end if;
  if mid is not null then
    select * into head from xedo_private.mission_heads where id=mid and owner_id=actor for update;
    if not found then raise sqlstate 'PT404' using message='MISSION_NOT_FOUND'; end if;
    if head.current_revision<>expected then raise sqlstate 'PT409' using message='REVISION_CONFLICT'; end if;
    select r.confirmed_review into prior_review from xedo_private.mission_revisions r where r.mission_id=mid and r.revision<=expected and r.confirmed_review is not null order by r.revision desc limit 1;
    latest_review:=(prior_review->>'reviewRevision')::integer;
  end if;
  if is_confirmation then
    confirmation:=p_payload->'confirmation';target:=confirmation->'target';
    if catalog is null or jsonb_typeof(confirmation) is distinct from 'object' or jsonb_typeof(target) is distinct from 'object'
      or not (confirmation ?& array['baseReviewRevision','target'])
      or exists(select 1 from jsonb_object_keys(confirmation) k where k not in ('baseReviewRevision','target'))
      or not (target ?& array['origin','areaId','sourceCandidateIds','geometry'])
      or exists(select 1 from jsonb_object_keys(target) k where k not in ('origin','areaId','sourceCandidateIds','geometry'))
      or coalesce(target->>'origin','') not in ('candidate','edited_candidate','manual')
      or jsonb_typeof(doc->'riskDraft') is distinct from 'object'
      or jsonb_typeof(doc->'riskDraft'->'areas') is distinct from 'array' or jsonb_array_length(doc->'riskDraft'->'areas')>128
      or jsonb_typeof(doc->'riskDraft'->'decisions') is distinct from 'array' or jsonb_array_length(doc->'riskDraft'->'decisions')>256
      or jsonb_typeof(target->'sourceCandidateIds') is distinct from 'array' or jsonb_array_length(target->'sourceCandidateIds')>256
    then raise sqlstate 'PT422' using message='CONFIRMATION_INVALID'; end if;
    if jsonb_typeof(doc->'imageSelection') is distinct from 'object'
      or not (doc->'imageSelection' ?& array['provider','sceneId','acquiredAt','selectionGeometry'])
      or exists(select 1 from jsonb_object_keys(doc->'imageSelection') k where k not in ('provider','sceneId','acquiredAt','selectionGeometry'))
      or coalesce(doc->'imageSelection'->>'provider','') not in ('gee','archived')
      or jsonb_typeof(doc->'imageSelection'->'sceneId') is distinct from 'string'
      or length(doc->'imageSelection'->>'sceneId') not between 1 and 300
      or jsonb_typeof(doc->'imageSelection'->'acquiredAt') is distinct from 'string'
      or length(doc->'imageSelection'->>'acquiredAt')>100
      or (doc->'imageSelection'->>'acquiredAt') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
      or not isfinite((doc->'imageSelection'->>'acquiredAt')::timestamptz)
    then raise sqlstate 'PT422' using message='IMAGE_IDENTITY_INVALID'; end if;
    if exists(select 1 from jsonb_object_keys(doc->'riskDraft') k where k not in ('baseReviewRevision','decisions','areas','selectedAreaId'))
      or (select count(distinct a->>'id') from jsonb_array_elements(doc->'riskDraft'->'areas') a)<>jsonb_array_length(doc->'riskDraft'->'areas')
    then raise sqlstate 'PT422' using message='RISK_DRAFT_INVALID'; end if;
    for draft_area in select value from jsonb_array_elements(doc->'riskDraft'->'areas') loop
      if jsonb_typeof(draft_area) is distinct from 'object'
        or not (draft_area ?& array['id','origin','sourceCandidateIds','rings'])
        or exists(select 1 from jsonb_object_keys(draft_area) k where k not in ('id','origin','sourceCandidateIds','rings'))
        or (draft_area->>'id')::uuid is null
        or coalesce(draft_area->>'origin','') not in ('candidate','edited_candidate','manual')
        or jsonb_typeof(draft_area->'sourceCandidateIds') is distinct from 'array'
        or jsonb_array_length(draft_area->'sourceCandidateIds')>256
        or jsonb_typeof(draft_area->'rings') is distinct from 'array' or jsonb_array_length(draft_area->'rings')>64
      then raise sqlstate 'PT422' using message='RISK_AREA_INVALID'; end if;
      if (select count(distinct value) from jsonb_array_elements(draft_area->'sourceCandidateIds'))<>jsonb_array_length(draft_area->'sourceCandidateIds') then raise sqlstate 'PT422' using message='CANDIDATE_REFERENCE_INVALID'; end if;
      if draft_area->>'origin'='manual' then
        if jsonb_array_length(draft_area->'sourceCandidateIds')<>0 then raise sqlstate 'PT422' using message='MANUAL_SOURCE_INVALID'; end if;
      else
        if jsonb_array_length(draft_area->'sourceCandidateIds')=0 then raise sqlstate 'PT422' using message='CANDIDATE_REFERENCE_REQUIRED'; end if;
        for source_id in select value from jsonb_array_elements_text(draft_area->'sourceCandidateIds') loop
          select f into raw_candidate from jsonb_array_elements(catalog->'candidates'->'features') f where f->>'id'=source_id;
          if raw_candidate is null then raise sqlstate 'PT422' using message='CANDIDATE_REFERENCE_INVALID'; end if;
        end loop;
        if draft_area->>'origin'='candidate' and (jsonb_array_length(draft_area->'sourceCandidateIds')<>1 or raw_candidate->'geometry' is distinct from jsonb_build_object('type','Polygon','coordinates',draft_area->'rings')) then raise sqlstate 'PT422' using message='RAW_CANDIDATE_CHANGED'; end if;
      end if;
    end loop;
    if (confirmation->>'baseReviewRevision')::integer is distinct from latest_review
      or doc->'riskDraft'->'baseReviewRevision' is distinct from confirmation->'baseReviewRevision'
    then raise sqlstate 'PT409' using message='REVIEW_REVISION_CONFLICT'; end if;
    if (target->>'areaId')::uuid is null or target->>'areaId' is distinct from doc->'riskDraft'->>'selectedAreaId'
      or (select count(*) from jsonb_array_elements(doc->'riskDraft'->'areas') a where a->>'id'=target->>'areaId')<>1
    then raise sqlstate 'PT422' using message='SELECTED_AREA_INVALID'; end if;
    select a into selected_area from jsonb_array_elements(doc->'riskDraft'->'areas') a where a->>'id'=target->>'areaId';
    if target->'origin' is distinct from selected_area->'origin' or target->'sourceCandidateIds' is distinct from selected_area->'sourceCandidateIds'
      or target->'geometry' is distinct from jsonb_build_object('type','Polygon','coordinates',selected_area->'rings')
      or target->'geometry' is distinct from doc->'planningInputs'->'geometry'
      or doc->'planningInputs' ? 'surveyId'
      or not xedo_private.risk_valid_target(target->'geometry')
      or not xedo_private.risk_valid_target(doc->'searchGeometry')
      or not xedo_private.risk_valid_target(doc->'imageSelection'->'selectionGeometry')
      or not xedo_private.risk_geometry_covers(doc->'searchGeometry',target->'geometry')
      or not xedo_private.risk_geometry_covers(doc->'imageSelection'->'selectionGeometry',target->'geometry')
      or not xedo_private.risk_geometry_covers(catalog->'footprint',target->'geometry')
    then raise sqlstate 'PT422' using message='TARGET_GEOMETRY_OR_COVERAGE_INVALID'; end if;
    if (select count(distinct value) from jsonb_array_elements(target->'sourceCandidateIds'))<>jsonb_array_length(target->'sourceCandidateIds') then raise sqlstate 'PT422' using message='CANDIDATE_REFERENCE_INVALID'; end if;
    -- Every recorded decision names a real candidate and accepted/edited decisions
    -- point at an existing draft area; rejected candidates cannot authorize target.
    for decision in select value from jsonb_array_elements(doc->'riskDraft'->'decisions') loop
      if jsonb_typeof(decision) is distinct from 'object' or coalesce(decision->>'action','') not in ('accept','edit','reject')
        or not (decision ?& array['candidateId','action','areaId'])
        or exists(select 1 from jsonb_object_keys(decision) k where k not in ('candidateId','action','areaId'))
        or not exists(select 1 from jsonb_array_elements(catalog->'candidates'->'features') f where f->>'id'=decision->>'candidateId')
      then raise sqlstate 'PT422' using message='CANDIDATE_DECISION_INVALID'; end if;
      if decision->>'action'='reject' then
        if decision->'areaId' is distinct from 'null'::jsonb then raise sqlstate 'PT422' using message='REJECTED_AREA_INVALID'; end if;
      else
        select a into linked_area from jsonb_array_elements(doc->'riskDraft'->'areas') a where a->>'id'=decision->>'areaId';
        if linked_area is null or not (linked_area->'sourceCandidateIds' ? (decision->>'candidateId'))
          or linked_area->>'origin' is distinct from (case decision->>'action' when 'accept' then 'candidate' else 'edited_candidate' end)
        then raise sqlstate 'PT422' using message='DECISION_AREA_LINK_INVALID'; end if;
      end if;
    end loop;
    if (select count(distinct value->>'candidateId') from jsonb_array_elements(doc->'riskDraft'->'decisions'))<>jsonb_array_length(doc->'riskDraft'->'decisions') then raise sqlstate 'PT422' using message='DUPLICATE_CANDIDATE_DECISION'; end if;
    if target->>'origin'='manual' then
      if jsonb_array_length(target->'sourceCandidateIds')<>0 then raise sqlstate 'PT422' using message='MANUAL_SOURCE_INVALID'; end if;
    elsif jsonb_array_length(target->'sourceCandidateIds')=0 then raise sqlstate 'PT422' using message='CANDIDATE_REFERENCE_REQUIRED';
    else
      for source_id in select value from jsonb_array_elements_text(target->'sourceCandidateIds') loop
        select f into raw_candidate from jsonb_array_elements(catalog->'candidates'->'features') f where f->>'id'=source_id;
        if raw_candidate is null or not exists(select 1 from jsonb_array_elements(doc->'riskDraft'->'decisions') d where d->>'candidateId'=source_id and d->>'areaId'=target->>'areaId' and d->>'action'=case target->>'origin' when 'candidate' then 'accept' else 'edit' end)
        then raise sqlstate 'PT422' using message='CANDIDATE_REFERENCE_INVALID'; end if;
      end loop;
      if target->>'origin'='candidate' and (jsonb_array_length(target->'sourceCandidateIds')<>1 or raw_candidate->'geometry' is distinct from target->'geometry') then raise sqlstate 'PT422' using message='RAW_CANDIDATE_CHANGED'; end if;
    end if;
    coverage_state:='partial_or_unavailable';
    if exists(select 1 from jsonb_array_elements(catalog->'coverage'->'features') f where f->'properties'->>'role'='valid_data' and xedo_private.risk_geometry_covers(f->'geometry',target->'geometry')) then coverage_state:='complete'; end if;
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
  if is_confirmation then
    confirmed_review:=jsonb_build_object('reviewId',gen_random_uuid(),'reviewRevision',wanted,'reviewerId',actor,'reviewedAt',committed_at,'analysisRef',ref,'target',target,'targetHash',encode(sha256(convert_to((target->'geometry')::text,'UTF8')),'hex'),'draftHash',encode(sha256(convert_to(((doc->'riskDraft')-'baseReviewRevision')::text,'UTF8')),'hex'),'coverageState',coverage_state);
  elsif prior_review is not null and doc->'analysisRef'=prior_review->'analysisRef' and doc->'riskDraft'->>'selectedAreaId'=prior_review->'target'->>'areaId'
    and encode(sha256(convert_to(((doc->'riskDraft')-'baseReviewRevision')::text,'UTF8')),'hex')=prior_review->>'draftHash'
    and doc->'planningInputs'->'geometry'=prior_review->'target'->'geometry'
    and exists(select 1 from jsonb_array_elements(coalesce(doc->'riskDraft'->'areas','[]')) a where a->>'id'=prior_review->'target'->>'areaId' and jsonb_build_object('type','Polygon','coordinates',a->'rings')=prior_review->'target'->'geometry' and a->'sourceCandidateIds'=prior_review->'target'->'sourceCandidateIds' and a->'origin'=prior_review->'target'->'origin') then
    confirmed_review:=prior_review;
  end if;
  doc_hash := encode(sha256(convert_to(doc::text,'UTF8')),'hex');
  insert into xedo_private.mission_revisions(mission_id,revision,parent_revision,document,document_hash,created_by,created_at,confirmed_review)
    values(mid,wanted,nullif(expected,0),doc,doc_hash,actor,committed_at,confirmed_review);
  result := jsonb_build_object('missionId',mid,'revision',wanted,'documentHash',doc_hash,'createdAt',committed_at,'confirmedReview',confirmed_review,'latestReviewRevision',case when is_confirmation then wanted else latest_review end);
  insert into xedo_private.mutation_receipts(owner_id,mutation_id,request_hash,response) values(actor,mutation,request_hash,result);
  return result;
exception when invalid_text_representation or numeric_value_out_of_range or invalid_datetime_format or datetime_field_overflow then
  raise sqlstate 'PT422' using message='INVALID_REQUEST';
end $$;


revoke all on function xedo_private.risk_cross(jsonb,jsonb,jsonb),xedo_private.risk_on_segment(jsonb,jsonb,jsonb),xedo_private.risk_point_ring(jsonb,jsonb,boolean),xedo_private.risk_point_geometry(jsonb,jsonb),xedo_private.risk_valid_target(jsonb),xedo_private.risk_geometry_covers(jsonb,jsonb) from public,anon,authenticated;
grant execute on function xedo_private.inspector_request(text,jsonb) to authenticated;
comment on function public.xedo_inspector(text,jsonb) is 'XEDO Inspector RPC: live session, owner/CAS/idempotent saves and authoritative prepared-risk confirmation.';
