-- Reproducible server-side indicator snapshots and audited retention execution.
-- Snapshot calculations use a fixed cutoff and canonical filter context.
-- Retention defaults to preview; execution requires an admin and an explicit token.

create table if not exists public.retention_runs (
  id text primary key default gen_random_uuid()::text,
  entity_id text not null references public.entities(id) on delete cascade,
  policy_id text not null references public.retention_policies(id) on delete restrict,
  execution_mode text not null check (execution_mode in ('preview','execute')),
  action text not null check (action in ('review','anonymize','delete')),
  status text not null check (status in ('completed','review_required','requires_manual_workflow','failed')),
  cutoff_at timestamptz not null,
  eligible_count integer not null default 0 check (eligible_count >= 0),
  affected_count integer not null default 0 check (affected_count >= 0),
  calculation_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);

create index if not exists retention_runs_entity_created_idx
  on public.retention_runs(entity_id, created_at desc);

alter table public.retention_runs enable row level security;
drop policy if exists retention_runs_read on public.retention_runs;
create policy retention_runs_read on public.retention_runs for select to authenticated
using (
  public.is_control_g_admin()
  or (entity_id = public.current_entity_id() and public.current_profile_role() = 'coordinator')
);

revoke all on public.retention_runs from anon, authenticated;
grant select on public.retention_runs to authenticated;

create or replace function public.calculate_indicator_metric(
  p_entity_id text,
  p_indicator_code text,
  p_cutoff_at timestamptz,
  p_filter_context jsonb default '{}'::jsonb,
  p_scope_municipality text default null,
  p_scope_form text default null
)
returns table (
  numerator_value numeric,
  denominator_value numeric,
  indicator_value numeric,
  sample_size integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_indicator_code = 'required_completeness' then
    return query
    with filtered as (
      select response.*
      from public.form_responses response
      where response.entity_id = p_entity_id
        and response.captured_at <= p_cutoff_at
        and (p_scope_municipality is null
          or (p_scope_municipality = '__unassigned__' and response.municipality_id is null)
          or response.municipality_id = p_scope_municipality)
        and (p_scope_form is null or response.form_id = p_scope_form)
        and (nullif(coalesce(p_filter_context->>'formId', p_filter_context->>'form_id'), '') is null
          or response.form_id = coalesce(p_filter_context->>'formId', p_filter_context->>'form_id'))
        and (nullif(coalesce(p_filter_context->>'municipalityId', p_filter_context->>'municipality_id'), '') is null
          or response.municipality_id = coalesce(p_filter_context->>'municipalityId', p_filter_context->>'municipality_id'))
        and (nullif(p_filter_context->>'status', '') is null or response.status = p_filter_context->>'status')
        and (nullif(coalesce(p_filter_context->>'from', p_filter_context->>'from_date'), '') is null
          or response.captured_at >= (coalesce(p_filter_context->>'from', p_filter_context->>'from_date') || 'T00:00:00Z')::timestamptz)
        and (nullif(coalesce(p_filter_context->>'to', p_filter_context->>'to_date'), '') is null
          or response.captured_at <= (coalesce(p_filter_context->>'to', p_filter_context->>'to_date') || 'T23:59:59.999Z')::timestamptz)
    ), required_by_response as (
      select
        response.id,
        count(distinct required_field.field_id)::numeric as required_count,
        count(distinct required_field.field_id) filter (where
          response.answers ? required_field.field_id
          and case jsonb_typeof(response.answers->required_field.field_id)
            when 'null' then false
            when 'string' then length(trim(both '"' from (response.answers->required_field.field_id)::text)) > 0
            when 'array' then jsonb_array_length(response.answers->required_field.field_id) > 0
            when 'object' then response.answers->required_field.field_id <> '{}'::jsonb
            else true
          end
        )::numeric as answered_count
      from filtered response
      join public.forms form on form.id = response.form_id
      cross join lateral (
        select distinct node->>'id' as field_id
        from jsonb_path_query(form.definition::jsonb, '$.** ? (@.id != null && @.required == true)'::jsonpath) node
        where nullif(node->>'id', '') is not null
      ) required_field
      group by response.id
    )
    select
      coalesce(sum(answered_count), 0),
      coalesce(sum(required_count), 0),
      case when sum(required_count) > 0
        then round((sum(answered_count) / sum(required_count)) * 100, 4)
        else null end,
      count(*)::integer
    from required_by_response;
    return;
  end if;

  return query
  with filtered as (
    select response.*
    from public.form_responses response
    where response.entity_id = p_entity_id
      and response.captured_at <= p_cutoff_at
      and (p_scope_municipality is null
        or (p_scope_municipality = '__unassigned__' and response.municipality_id is null)
        or response.municipality_id = p_scope_municipality)
      and (p_scope_form is null or response.form_id = p_scope_form)
      and (nullif(coalesce(p_filter_context->>'formId', p_filter_context->>'form_id'), '') is null
        or response.form_id = coalesce(p_filter_context->>'formId', p_filter_context->>'form_id'))
      and (nullif(coalesce(p_filter_context->>'municipalityId', p_filter_context->>'municipality_id'), '') is null
        or response.municipality_id = coalesce(p_filter_context->>'municipalityId', p_filter_context->>'municipality_id'))
      and (nullif(p_filter_context->>'status', '') is null or response.status = p_filter_context->>'status')
      and (nullif(coalesce(p_filter_context->>'from', p_filter_context->>'from_date'), '') is null
        or response.captured_at >= (coalesce(p_filter_context->>'from', p_filter_context->>'from_date') || 'T00:00:00Z')::timestamptz)
      and (nullif(coalesce(p_filter_context->>'to', p_filter_context->>'to_date'), '') is null
        or response.captured_at <= (coalesce(p_filter_context->>'to', p_filter_context->>'to_date') || 'T23:59:59.999Z')::timestamptz)
  ), metrics as (
    select
      count(*)::numeric as total_count,
      count(*) filter (where
        latitude between -90 and 90 and longitude between -180 and 180
        and not (latitude = 0 and longitude = 0)
      )::numeric as gps_count,
      count(*) filter (where status in ('reviewed','approved','rejected'))::numeric as reviewed_count,
      count(*) filter (where status = 'approved')::numeric as approved_count,
      coalesce(sum(extract(epoch from (synced_at - captured_at)) / 60.0)
        filter (where synced_at is not null and synced_at >= captured_at), 0)::numeric as sync_minutes,
      count(*) filter (where synced_at is not null and synced_at >= captured_at)::numeric as sync_count
    from filtered
  )
  select
    case p_indicator_code
      when 'gps_coverage' then gps_count
      when 'reviewed_share' then reviewed_count
      when 'approved_share' then approved_count
      when 'average_sync_lag' then sync_minutes
      else total_count end,
    case p_indicator_code
      when 'approved_share' then reviewed_count
      when 'average_sync_lag' then sync_count
      else total_count end,
    case p_indicator_code
      when 'gps_coverage' then case when total_count > 0 then round(gps_count / total_count * 100, 4) end
      when 'reviewed_share' then case when total_count > 0 then round(reviewed_count / total_count * 100, 4) end
      when 'approved_share' then case when reviewed_count > 0 then round(approved_count / reviewed_count * 100, 4) end
      when 'average_sync_lag' then case when sync_count > 0 then round(sync_minutes / sync_count, 4) end
      else total_count end,
    (case p_indicator_code when 'average_sync_lag' then sync_count else total_count end)::integer
  from metrics;
end;
$$;

revoke all on function public.calculate_indicator_metric(text,text,timestamptz,jsonb,text,text) from public, anon, authenticated;

create or replace function public.run_indicator_snapshots(
  p_entity_id text,
  p_cutoff_at timestamptz default now(),
  p_filter_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  definition record;
  scope_record record;
  snapshot_id text;
  snapshot_count integer := 0;
  numerator numeric;
  denominator numeric;
  value numeric;
  samples integer;
  territory_code_value text;
  territory_name_value text;
  caller_role text := public.current_profile_role();
  service_request boolean := coalesce(auth.role() = 'service_role', false);
begin
  if not service_request and (
    auth.uid() is null
    or (
      not public.is_control_g_admin()
      and (public.current_entity_id() is distinct from p_entity_id or caller_role not in ('coordinator','support'))
    )
  ) then
    raise exception 'INDICATOR_SNAPSHOT_FORBIDDEN';
  end if;
  if not exists (select 1 from public.entities where id = p_entity_id) then
    raise exception 'ENTITY_NOT_FOUND';
  end if;

  for definition in
    select distinct on (indicator.code) indicator.*
    from public.indicator_definitions indicator
    where indicator.status = 'published'
      and (indicator.entity_id is null or indicator.entity_id = p_entity_id)
    order by indicator.code, (indicator.entity_id is not null) desc, indicator.version desc
  loop
    if definition.territory_level = 'municipality' then
      for scope_record in
        select municipality.id as code, municipality.municipality_name as name
        from public.entity_municipalities municipality
        where municipality.entity_id = p_entity_id
        union all select '__unassigned__', 'Sin territorio asignado'
      loop
        territory_code_value := scope_record.code;
        territory_name_value := scope_record.name;
        select metric.numerator_value, metric.denominator_value, metric.indicator_value, metric.sample_size
          into numerator, denominator, value, samples
        from public.calculate_indicator_metric(
          p_entity_id, definition.code, p_cutoff_at, p_filter_context,
          scope_record.code,
          null
        ) metric;
        snapshot_id := 'snapshot:' || md5(concat_ws('|', p_entity_id, definition.id, p_cutoff_at::text, p_filter_context::text, territory_code_value));
        insert into public.indicator_snapshots (
          id, entity_id, indicator_definition_id, cutoff_at, filter_context,
          numerator_value, denominator_value, indicator_value, sample_size,
          territory_code, territory_name, suppressed, calculation_metadata, created_by
        ) values (
          snapshot_id, p_entity_id, definition.id, p_cutoff_at, p_filter_context,
          numerator, denominator, value, coalesce(samples, 0), territory_code_value,
          territory_name_value, coalesce(samples, 0) > 0 and samples < definition.minimum_group_size,
          jsonb_build_object('engine','control-g-server-v1','indicator_code',definition.code,'indicator_version',definition.version,'methodology',definition.methodology),
          auth.uid()
        ) on conflict (id) do update set
          numerator_value = excluded.numerator_value, denominator_value = excluded.denominator_value,
          indicator_value = excluded.indicator_value, sample_size = excluded.sample_size,
          suppressed = excluded.suppressed, calculation_metadata = excluded.calculation_metadata,
          created_by = excluded.created_by, created_at = now();
        snapshot_count := snapshot_count + 1;
      end loop;
    elsif definition.territory_level = 'form' then
      for scope_record in select form.id as code, form.title as name from public.forms form where form.entity_id = p_entity_id loop
        territory_code_value := scope_record.code;
        territory_name_value := scope_record.name;
        select metric.numerator_value, metric.denominator_value, metric.indicator_value, metric.sample_size
          into numerator, denominator, value, samples
        from public.calculate_indicator_metric(p_entity_id, definition.code, p_cutoff_at, p_filter_context, null, scope_record.code) metric;
        snapshot_id := 'snapshot:' || md5(concat_ws('|', p_entity_id, definition.id, p_cutoff_at::text, p_filter_context::text, territory_code_value));
        insert into public.indicator_snapshots (
          id, entity_id, indicator_definition_id, cutoff_at, filter_context,
          numerator_value, denominator_value, indicator_value, sample_size,
          territory_code, territory_name, suppressed, calculation_metadata, created_by
        ) values (
          snapshot_id, p_entity_id, definition.id, p_cutoff_at, p_filter_context,
          numerator, denominator, value, coalesce(samples, 0), territory_code_value,
          territory_name_value, coalesce(samples, 0) > 0 and samples < definition.minimum_group_size,
          jsonb_build_object('engine','control-g-server-v1','indicator_code',definition.code,'indicator_version',definition.version,'methodology',definition.methodology),
          auth.uid()
        ) on conflict (id) do update set
          numerator_value = excluded.numerator_value, denominator_value = excluded.denominator_value,
          indicator_value = excluded.indicator_value, sample_size = excluded.sample_size,
          suppressed = excluded.suppressed, calculation_metadata = excluded.calculation_metadata,
          created_by = excluded.created_by, created_at = now();
        snapshot_count := snapshot_count + 1;
      end loop;
    else
      territory_code_value := null;
      territory_name_value := null;
      select metric.numerator_value, metric.denominator_value, metric.indicator_value, metric.sample_size
        into numerator, denominator, value, samples
      from public.calculate_indicator_metric(p_entity_id, definition.code, p_cutoff_at, p_filter_context, null, null) metric;
      snapshot_id := 'snapshot:' || md5(concat_ws('|', p_entity_id, definition.id, p_cutoff_at::text, p_filter_context::text, '__entity__'));
      insert into public.indicator_snapshots (
        id, entity_id, indicator_definition_id, cutoff_at, filter_context,
        numerator_value, denominator_value, indicator_value, sample_size,
        territory_code, territory_name, suppressed, calculation_metadata, created_by
      ) values (
        snapshot_id, p_entity_id, definition.id, p_cutoff_at, p_filter_context,
        numerator, denominator, value, coalesce(samples, 0), null, null,
        coalesce(samples, 0) > 0 and samples < definition.minimum_group_size,
        jsonb_build_object('engine','control-g-server-v1','indicator_code',definition.code,'indicator_version',definition.version,'methodology',definition.methodology),
        auth.uid()
      ) on conflict (id) do update set
        numerator_value = excluded.numerator_value, denominator_value = excluded.denominator_value,
        indicator_value = excluded.indicator_value, sample_size = excluded.sample_size,
        suppressed = excluded.suppressed, calculation_metadata = excluded.calculation_metadata,
        created_by = excluded.created_by, created_at = now();
      snapshot_count := snapshot_count + 1;
    end if;
  end loop;

  insert into public.audit_log(entity_id, user_id, action, table_name, metadata)
  values (p_entity_id, auth.uid(), 'indicator_snapshots_generated', 'indicator_snapshots',
    jsonb_build_object('cutoff_at',p_cutoff_at,'filter_context',p_filter_context,'snapshot_count',snapshot_count,'engine','control-g-server-v1'));

  return jsonb_build_object('entity_id',p_entity_id,'cutoff_at',p_cutoff_at,'snapshot_count',snapshot_count,'engine','control-g-server-v1');
end;
$$;

revoke all on function public.run_indicator_snapshots(text,timestamptz,jsonb) from public, anon;
grant execute on function public.run_indicator_snapshots(text,timestamptz,jsonb) to authenticated, service_role;

create or replace function public.anonymize_response_json(value jsonb)
returns jsonb
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if value is null or value = 'null'::jsonb then return 'null'::jsonb; end if;
  if jsonb_typeof(value) = 'object' and value->>'captureType' in ('geotrace','geoshape') then return 'null'::jsonb; end if;
  if jsonb_typeof(value) = 'object' then
    select coalesce(jsonb_object_agg(item.key, public.anonymize_response_json(item.value)), '{}'::jsonb)
      into result
    from jsonb_each(value) item
    where item.key !~* '(nombre|apellido|document|cedula|identific|telefono|celular|correo|email|direccion|firma|signature|foto|photo|archivo|file|nacimiento|birth|token|password|secret|latitud|latitude|longitud|longitude|coordinates|vertices)';
    return result;
  end if;
  if jsonb_typeof(value) = 'array' then
    select coalesce(jsonb_agg(public.anonymize_response_json(item.value)), '[]'::jsonb)
      into result from jsonb_array_elements(value) item;
    return result;
  end if;
  return value;
end;
$$;

revoke all on function public.anonymize_response_json(jsonb) from public, anon, authenticated;

create or replace function public.run_retention_policy(
  p_policy_id text,
  p_execute boolean default false,
  p_confirmation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy record;
  cutoff_value timestamptz;
  eligible integer := 0;
  affected integer := 0;
  run_status text := 'completed';
  run_id text := gen_random_uuid()::text;
  caller_role text := public.current_profile_role();
begin
  select * into policy from public.retention_policies where id = p_policy_id;
  if not found then raise exception 'RETENTION_POLICY_NOT_FOUND'; end if;
  if auth.uid() is null or (
    not public.is_control_g_admin()
    and (public.current_entity_id() is distinct from policy.entity_id or caller_role <> 'coordinator')
  ) then raise exception 'RETENTION_POLICY_FORBIDDEN'; end if;
  if policy.status <> 'active' or policy.effective_from > current_date then
    raise exception 'RETENTION_POLICY_NOT_ACTIVE';
  end if;
  if p_execute and not public.is_control_g_admin() then raise exception 'RETENTION_EXECUTION_ADMIN_REQUIRED'; end if;
  if p_execute and p_confirmation is distinct from ('RETENTION:' || policy.id) then raise exception 'RETENTION_CONFIRMATION_INVALID'; end if;

  cutoff_value := now() - make_interval(days => policy.retention_days);
  case policy.data_class
    when 'form_responses' then select count(*) into eligible from public.form_responses where entity_id = policy.entity_id and captured_at < cutoff_value;
    when 'evidence_files' then select count(*) into eligible from public.evidence_files where entity_id = policy.entity_id and uploaded_at < cutoff_value;
    when 'consent_records' then select count(*) into eligible from public.consent_records where entity_id = policy.entity_id and captured_at < cutoff_value;
    when 'sensitive_access_log' then select count(*) into eligible from public.sensitive_access_log where entity_id = policy.entity_id and created_at < cutoff_value;
    when 'indicator_snapshots' then select count(*) into eligible from public.indicator_snapshots where entity_id = policy.entity_id and cutoff_at < cutoff_value;
    when 'report_runs' then select count(*) into eligible from public.report_runs where entity_id = policy.entity_id and created_at < cutoff_value;
    else raise exception 'RETENTION_DATA_CLASS_UNSUPPORTED';
  end case;

  if p_execute then
    if policy.disposition = 'review' then
      run_status := 'review_required';
    elsif policy.disposition = 'anonymize' and policy.data_class = 'form_responses' then
      update public.form_responses response set
        answers = public.anonymize_response_json(response.answers),
        answers_json = public.anonymize_response_json(response.answers)::text,
        family_id = null,
        latitude = case when response.latitude is null then null else round(response.latitude::numeric, 2)::double precision end,
        longitude = case when response.longitude is null then null else round(response.longitude::numeric, 2)::double precision end,
        original_latitude = null,
        original_longitude = null,
        review_notes = null
      where response.entity_id = policy.entity_id and response.captured_at < cutoff_value;
      get diagnostics affected = row_count;
    elsif policy.disposition = 'delete' and policy.data_class = 'sensitive_access_log' then
      delete from public.sensitive_access_log where entity_id = policy.entity_id and created_at < cutoff_value;
      get diagnostics affected = row_count;
    elsif policy.disposition = 'delete' and policy.data_class = 'indicator_snapshots' then
      delete from public.indicator_snapshots where entity_id = policy.entity_id and cutoff_at < cutoff_value;
      get diagnostics affected = row_count;
    else
      run_status := 'requires_manual_workflow';
    end if;
  end if;

  insert into public.retention_runs(
    id, entity_id, policy_id, execution_mode, action, status, cutoff_at,
    eligible_count, affected_count, calculation_metadata, created_by
  ) values (
    run_id, policy.entity_id, policy.id, case when p_execute then 'execute' else 'preview' end,
    policy.disposition, run_status, cutoff_value, eligible, affected,
    jsonb_build_object(
      'engine','control-g-retention-v1','data_class',policy.data_class,
      'retention_days',policy.retention_days,
      'note',case when run_status = 'requires_manual_workflow' then 'Requiere purga coordinada de Storage o revisión legal.' else null end
    ), auth.uid()
  );

  insert into public.audit_log(entity_id,user_id,action,table_name,record_id,metadata)
  values (policy.entity_id,auth.uid(),case when p_execute then 'retention_execute' else 'retention_preview' end,
    'retention_policies',policy.id,jsonb_build_object('run_id',run_id,'eligible_count',eligible,'affected_count',affected,'status',run_status));

  return jsonb_build_object(
    'run_id',run_id,'entity_id',policy.entity_id,'policy_id',policy.id,
    'mode',case when p_execute then 'execute' else 'preview' end,
    'action',policy.disposition,'status',run_status,'cutoff_at',cutoff_value,
    'eligible_count',eligible,'affected_count',affected
  );
end;
$$;

revoke all on function public.run_retention_policy(text,boolean,text) from public, anon;
grant execute on function public.run_retention_policy(text,boolean,text) to authenticated;
