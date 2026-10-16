-- Additive migration: durable, atomic AI request budgets. No prompts, survey
-- answers or provider secrets are stored. Rollback: deploy a forward migration
-- revoking execute on consume_ai_form_quota; retain counters for audit.
create table if not exists public.ai_form_usage (
  scope text not null check (scope in ('platform','entity','user')),
  scope_id text not null,
  usage_day date not null,
  used integer not null default 0 check (used >= 0),
  minute_start timestamptz not null,
  minute_used integer not null default 0 check (minute_used >= 0),
  primary key(scope, scope_id, usage_day)
);
alter table public.ai_form_usage enable row level security;
revoke all on public.ai_form_usage from public, anon, authenticated;

create or replace function public.consume_ai_form_quota(p_entity_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  actor_entity text;
  target_status text;
  request_time timestamptz := now();
  today date := (now() at time zone 'UTC')::date;
  bucket record;
  usage public.ai_form_usage%rowtype;
begin
  select role, entity_id into actor_role, actor_entity
  from public.user_profiles where user_id = actor and status = 'active';
  select status into target_status from public.entities where id = p_entity_id;
  if actor is null or actor_role is null or actor_role not in ('admin','coordinator')
    or target_status is distinct from 'active'
    or (actor_role <> 'admin' and actor_entity is distinct from p_entity_id) then
    raise exception 'AI_ENTITY_FORBIDDEN';
  end if;

  -- Always lock platform -> entity -> user. A failed bucket rolls back all
  -- reservations, and concurrent instances cannot exceed these shared limits.
  for bucket in select * from (values
    (1, 'platform'::text, 'control-g'::text, 200, 20),
    (2, 'entity'::text, p_entity_id, 100, 10),
    (3, 'user'::text, actor::text, 20, 3)
  ) as limits(priority, scope, scope_id, daily_limit, minute_limit) order by priority loop
    insert into public.ai_form_usage(scope, scope_id, usage_day, minute_start)
    values(bucket.scope, bucket.scope_id, today, request_time)
    on conflict do nothing;
    select * into usage from public.ai_form_usage
    where scope = bucket.scope and scope_id = bucket.scope_id and usage_day = today
    for update;
    if usage.used >= bucket.daily_limit then raise exception 'AI_RATE_LIMITED'; end if;
    if usage.minute_start + interval '1 minute' > request_time and usage.minute_used >= bucket.minute_limit then
      raise exception 'AI_RATE_LIMITED';
    end if;
    update public.ai_form_usage
    set used = used + 1,
        minute_used = case when minute_start + interval '1 minute' <= request_time then 1 else minute_used + 1 end,
        minute_start = case when minute_start + interval '1 minute' <= request_time then request_time else minute_start end
    where scope = bucket.scope and scope_id = bucket.scope_id and usage_day = today;
  end loop;
  return jsonb_build_object('allowed', true);
end;
$$;
revoke all on function public.consume_ai_form_quota(text) from public, anon;
grant execute on function public.consume_ai_form_quota(text) to authenticated;
notify pgrst, 'reload schema';
