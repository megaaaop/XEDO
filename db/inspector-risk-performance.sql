-- Private geometry predicate performance repair. Apply after inspector-ai.sql.
-- No new extension, role, timeout, queue version, table or geometry policy.
-- Root must compare/back up actual predecessor definitions before applying.
create or replace function xedo_private.risk_point_ring(p jsonb,r jsonb,p_boundary boolean default true) returns boolean
language plpgsql immutable set search_path='' as $$
declare i integer;n integer;inside boolean:=false;
 x double precision:=(p->>0)::double precision;y double precision:=(p->>1)::double precision;
 ax double precision;ay double precision;next_x double precision;next_y double precision;
begin
 n:=jsonb_array_length(r);
 -- Match the old empty/one-point ring behavior without casting unused points.
 if n<2 then return inside; end if;
 ax:=(r->0->>0)::double precision;ay:=(r->0->>1)::double precision;
 for i in 0..n-2 loop
  next_x:=(r->(i+1)->>0)::double precision;next_y:=(r->(i+1)->>1)::double precision;
  -- Inline the identical risk_cross/on_segment arithmetic and tolerances.
  -- No edge is closed, rounded, simplified, omitted or re-ordered.
  if abs((next_x-ax)*(y-ay)-(next_y-ay)*(x-ax))<1e-13
     and x between least(ax,next_x)-1e-11 and greatest(ax,next_x)+1e-11
     and y between least(ay,next_y)-1e-11 and greatest(ay,next_y)+1e-11
  then return p_boundary; end if;
  if ((ay>y)<>(next_y>y)) and x<(next_x-ax)*(y-ay)/(next_y-ay)+ax
  then inside:=not inside; end if;
  ax:=next_x;ay:=next_y;
 end loop;
 return inside;
end $$;

create or replace function xedo_private.risk_geometry_covers(g jsonb,target jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare polygons jsonb; poly jsonb; ring jsonb; r jsonb:=target->'coordinates'->0; i integer; j integer; k integer;
 a jsonb;b jsonb;c jsonb;d jsonb;p jsonb; ax double precision;ay double precision;dx double precision;dy double precision;
 cx double precision;cy double precision;ex double precision;ey double precision;den double precision;t double precision;u double precision;times double precision[];ordered double precision[];v double precision;
 tx_min double precision;tx_max double precision;ty_min double precision;ty_max double precision;
 hx_min double precision;hx_max double precision;hy_min double precision;hy_max double precision;
begin
 if g is null or target is null or not xedo_private.risk_valid_target(target) then return false; end if;
 polygons:=case g->>'type' when 'Polygon' then jsonb_build_array(g->'coordinates') when 'MultiPolygon' then g->'coordinates' else '[]'::jsonb end;
 if jsonb_array_length(polygons)=0 then return false; end if;
 -- Cached bounds are only a conservative broad phase for final hole witnesses.
 select min((q->>0)::double precision),max((q->>0)::double precision),
        min((q->>1)::double precision),max((q->>1)::double precision)
 into tx_min,tx_max,ty_min,ty_max from jsonb_array_elements(r) q;
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
   select min((q->>0)::double precision),max((q->>0)::double precision),
          min((q->>1)::double precision),max((q->>1)::double precision)
   into hx_min,hx_max,hy_min,hy_max from jsonb_array_elements(ring) q;
   -- Every midpoint/triple centroid below lies within the hole bbox. Strict
   -- disjointness with the existing 1e-11 coordinate tolerance cannot contain
   -- an inside-target witness. Touching/nearby boxes still run exact checks.
   if hx_max<tx_min-1e-11 or hx_min>tx_max+1e-11
      or hy_max<ty_min-1e-11 or hy_min>ty_max+1e-11 then continue; end if;
   for j in 0..jsonb_array_length(ring)-2 loop
    c:=ring->j;d:=ring->(j+1);p:=jsonb_build_array(((c->>0)::double precision+(d->>0)::double precision)/2,((c->>1)::double precision+(d->>1)::double precision)/2);
    if xedo_private.risk_point_ring(p,r,false) then return false; end if;
    -- If the target coincides with the hole boundary, every midpoint is on its
    -- boundary. A simple polygon has an ear: one consecutive-triple centroid
    -- lies strictly in that hole, which must not be reported as covered data.
    a:=ring->((j+2)%(jsonb_array_length(ring)-1));
    p:=jsonb_build_array(((c->>0)::double precision+(d->>0)::double precision+(a->>0)::double precision)/3,((c->>1)::double precision+(d->>1)::double precision+(a->>1)::double precision)/3);
    -- Explicit nesting guarantees the short target ring is checked first.
    if xedo_private.risk_point_ring(p,r,false) then
     if xedo_private.risk_point_ring(p,ring,false) then return false; end if;
    end if;
   end loop;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;

revoke all on function xedo_private.risk_point_ring(jsonb,jsonb,boolean),xedo_private.risk_geometry_covers(jsonb,jsonb) from public,anon,authenticated;
