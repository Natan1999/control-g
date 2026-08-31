-- Offline line/polygon capture extracted from form answers into governed PostGIS.
-- Raw GNSS vertices remain in the response JSON for evidence; this table provides
-- indexed geometry and non-sensitive operational metrics to the internal map.

alter table public.entities
  add column if not exists map_minimum_group_size integer not null default 5,
  add column if not exists map_coverage_target integer not null default 10;

alter table public.entities drop constraint if exists entities_map_minimum_group_size_check;
alter table public.entities add constraint entities_map_minimum_group_size_check
  check (map_minimum_group_size between 1 and 100);
alter table public.entities drop constraint if exists entities_map_coverage_target_check;
alter table public.entities add constraint entities_map_coverage_target_check
  check (map_coverage_target between 1 and 1000000);

create table if not exists public.spatial_features (
  id text primary key,
  entity_id text not null references public.entities(id) on delete cascade,
  response_id text not null references public.form_responses(id) on delete cascade,
  response_local_id text not null,
  form_id text not null references public.forms(id) on delete restrict,
  field_id text not null,
  professional_id uuid not null,
  geometry_type text not null check (geometry_type in ('LineString','Polygon')),
  geometry extensions.geometry(Geometry, 4326) not null,
  geojson jsonb not null check (jsonb_typeof(geojson) = 'object'),
  vertex_count integer not null check (vertex_count >= 2 and vertex_count <= 2000),
  length_m double precision not null default 0 check (length_m >= 0),
  area_m2 double precision not null default 0 check (area_m2 >= 0),
  maximum_accuracy_m double precision,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(response_id, field_id)
);

create index if not exists spatial_features_geometry_gix
  on public.spatial_features using gist(geometry);
create index if not exists spatial_features_entity_captured_idx
  on public.spatial_features(entity_id, captured_at desc);
create index if not exists spatial_features_professional_idx
  on public.spatial_features(professional_id, captured_at desc);

drop trigger if exists set_spatial_features_updated_at on public.spatial_features;
create trigger set_spatial_features_updated_at before update on public.spatial_features
for each row execute function public.set_updated_at();

create or replace function public.sync_spatial_features_from_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer record;
  coordinates jsonb;
  closed_coordinates jsonb;
  geometry_json jsonb;
  parsed_geometry extensions.geometry;
  capture_type text;
  geometry_type_value text;
  vertex_total integer;
  maximum_accuracy double precision;
begin
  delete from public.spatial_features where response_id = new.id;

  for answer in select key, value from jsonb_each(coalesce(new.answers, '{}'::jsonb)) loop
    begin
      if jsonb_typeof(answer.value) <> 'object'
         or coalesce((answer.value->>'complete')::boolean, false) is not true then
        continue;
      end if;
      capture_type := answer.value->>'captureType';
      geometry_type_value := answer.value->>'geometryType';
      if (capture_type = 'geotrace' and geometry_type_value <> 'LineString')
         or (capture_type = 'geoshape' and geometry_type_value <> 'Polygon')
         or capture_type not in ('geotrace','geoshape') then
        continue;
      end if;
      coordinates := answer.value->'coordinates';
      if jsonb_typeof(coordinates) <> 'array' then continue; end if;
      vertex_total := jsonb_array_length(coordinates);
      if vertex_total > 2000
         or (geometry_type_value = 'LineString' and vertex_total < 2)
         or (geometry_type_value = 'Polygon' and vertex_total < 3) then
        continue;
      end if;

      if geometry_type_value = 'Polygon' then
        closed_coordinates := coordinates;
        if coordinates->0 is distinct from coordinates->(vertex_total - 1) then
          closed_coordinates := coordinates || jsonb_build_array(coordinates->0);
        end if;
        geometry_json := jsonb_build_object('type', 'Polygon', 'coordinates', jsonb_build_array(closed_coordinates));
      else
        geometry_json := jsonb_build_object('type', 'LineString', 'coordinates', coordinates);
      end if;

      parsed_geometry := extensions.st_setsrid(
        extensions.st_force2d(extensions.st_geomfromgeojson(geometry_json::text)),
        4326
      );
      if extensions.st_isempty(parsed_geometry) or not extensions.st_isvalid(parsed_geometry) then continue; end if;

      select max(case
        when jsonb_typeof(vertex) = 'object' and (vertex->>'accuracyM') ~ '^[0-9]+([.][0-9]+)?$'
        then (vertex->>'accuracyM')::double precision else null end)
      into maximum_accuracy
      from jsonb_array_elements(coalesce(answer.value->'vertices', '[]'::jsonb)) vertex;

      insert into public.spatial_features (
        id, entity_id, response_id, response_local_id, form_id, field_id,
        professional_id, geometry_type, geometry, geojson, vertex_count,
        length_m, area_m2, maximum_accuracy_m, captured_at
      ) values (
        new.id || ':' || answer.key,
        new.entity_id,
        new.id,
        new.local_id,
        new.form_id,
        answer.key,
        new.professional_id,
        geometry_type_value,
        parsed_geometry,
        jsonb_build_object(
          'type', 'Feature',
          'geometry', geometry_json,
          'properties', jsonb_build_object(
            'control_g_response_id', new.id,
            'field_id', answer.key,
            'geometry_type', geometry_type_value,
            'captured_at', coalesce(answer.value->>'capturedAt', new.captured_at::text),
            'vertex_count', vertex_total,
            'length_m', extensions.st_length(parsed_geometry::extensions.geography),
            'area_m2', case when geometry_type_value = 'Polygon'
              then extensions.st_area(parsed_geometry::extensions.geography) else 0 end
          )
        ),
        vertex_total,
        extensions.st_length(parsed_geometry::extensions.geography),
        case when geometry_type_value = 'Polygon'
          then extensions.st_area(parsed_geometry::extensions.geography) else 0 end,
        maximum_accuracy,
        coalesce((answer.value->>'capturedAt')::timestamptz, new.captured_at)
      )
      on conflict (response_id, field_id) do update set
        geometry = excluded.geometry,
        geojson = excluded.geojson,
        vertex_count = excluded.vertex_count,
        length_m = excluded.length_m,
        area_m2 = excluded.area_m2,
        maximum_accuracy_m = excluded.maximum_accuracy_m,
        captured_at = excluded.captured_at;
    exception when others then
      -- A malformed optional geometry must not block the original offline response.
      continue;
    end;
  end loop;
  return new;
end;
$$;

drop trigger if exists sync_spatial_features_after_response on public.form_responses;
create trigger sync_spatial_features_after_response
after insert or update of answers on public.form_responses
for each row execute function public.sync_spatial_features_from_response();

alter table public.spatial_features enable row level security;
drop policy if exists spatial_features_select on public.spatial_features;
create policy spatial_features_select on public.spatial_features for select to authenticated
using (
  public.is_control_g_admin()
  or (
    entity_id = public.current_entity_id()
    and (public.current_profile_role() in ('coordinator','support') or professional_id = auth.uid())
  )
);

revoke all on public.spatial_features from anon, authenticated;
grant select on public.spatial_features to authenticated;

-- Backfill geometry for existing responses that already contain compatible answers.
update public.form_responses set answers = answers
where exists (
  select 1 from jsonb_each(coalesce(form_responses.answers, '{}'::jsonb)) answer
  where answer.value->>'captureType' in ('geotrace','geoshape')
);
