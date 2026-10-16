-- Run after 202610150001_ai_form_quota.sql. All test reservations roll back.
-- Uses only existing role/entity identifiers; no personal answers are read.
begin;
do $check$
declare
  coordinator record;
  professional uuid;
  blocked boolean := false;
begin
  if has_table_privilege('authenticated', 'public.ai_form_usage', 'INSERT')
    or has_table_privilege('authenticated', 'public.ai_form_usage', 'UPDATE')
    or has_function_privilege('anon', 'public.consume_ai_form_quota(text)', 'EXECUTE') then
    raise exception 'AI_QUOTA_PRIVILEGES_UNSAFE';
  end if;
  select profile.user_id, profile.entity_id into coordinator
  from public.user_profiles profile join public.entities entity on entity.id = profile.entity_id
  where profile.role = 'coordinator' and profile.status = 'active' and entity.status = 'active'
  order by profile.user_id limit 1;
  if coordinator.user_id is null then raise exception 'AI_CHECK_NEEDS_ACTIVE_COORDINATOR'; end if;
  perform set_config('request.jwt.claim.sub', coordinator.user_id::text, true);
  perform public.consume_ai_form_quota(coordinator.entity_id);
  perform public.consume_ai_form_quota(coordinator.entity_id);
  perform public.consume_ai_form_quota(coordinator.entity_id);
  begin
    perform public.consume_ai_form_quota(coordinator.entity_id);
  exception when others then
    if sqlerrm = 'AI_RATE_LIMITED' then blocked := true; else raise; end if;
  end;
  if not blocked then raise exception 'AI_CHECK_BURST_NOT_ENFORCED'; end if;
  blocked := false;
  begin
    perform public.consume_ai_form_quota('__entity_not_authorized__');
  exception when others then
    if sqlerrm = 'AI_ENTITY_FORBIDDEN' then blocked := true; else raise; end if;
  end;
  if not blocked then raise exception 'AI_CHECK_TENANCY_NOT_ENFORCED'; end if;
  select user_id into professional from public.user_profiles
  where role = 'professional' and status = 'active' order by user_id limit 1;
  if professional is null then raise exception 'AI_CHECK_NEEDS_ACTIVE_PROFESSIONAL'; end if;
  perform set_config('request.jwt.claim.sub', professional::text, true);
  blocked := false;
  begin
    perform public.consume_ai_form_quota(coordinator.entity_id);
  exception when others then
    if sqlerrm = 'AI_ENTITY_FORBIDDEN' then blocked := true; else raise; end if;
  end;
  if not blocked then raise exception 'AI_CHECK_ROLE_NOT_ENFORCED'; end if;
  raise notice 'AI_CHECK_OK: permissions, coordinator, burst, entity isolation, professional denied';
end;
$check$;
rollback;
select count(*) as ai_reservations_after_rollback from public.ai_form_usage;
