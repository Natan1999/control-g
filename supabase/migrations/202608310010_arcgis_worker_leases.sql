-- Recoverable ArcGIS worker leases. The scheduled worker claims one job at a
-- time with SKIP LOCKED; abandoned running jobs become eligible after expiry.

alter table public.arcgis_jobs
  add column if not exists worker_id text,
  add column if not exists worker_started_at timestamptz,
  add column if not exists lease_expires_at timestamptz;

alter table public.arcgis_jobs
  drop constraint if exists arcgis_jobs_worker_id_check;
alter table public.arcgis_jobs
  add constraint arcgis_jobs_worker_id_check
  check (worker_id is null or worker_id ~ '^(worker|manual):[a-f0-9-]{36}$') not valid;
alter table public.arcgis_jobs
  validate constraint arcgis_jobs_worker_id_check;

create index if not exists arcgis_jobs_worker_due_idx
  on public.arcgis_jobs(status, next_retry_at, lease_expires_at, created_at)
  where status in ('pending','partial','failed','running');

create or replace function public.claim_due_arcgis_jobs(
  p_worker_id text,
  p_limit integer default 1,
  p_lease_seconds integer default 180
)
returns setof public.arcgis_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'ARCGIS_WORKER_FORBIDDEN' using errcode = '42501';
  end if;
  if p_worker_id is null or p_worker_id !~ '^worker:[a-f0-9-]{36}$' then
    raise exception 'ARCGIS_WORKER_ID_INVALID' using errcode = '22023';
  end if;
  if p_limit not between 1 and 10 or p_lease_seconds not between 60 and 600 then
    raise exception 'ARCGIS_WORKER_LIMIT_INVALID' using errcode = '22023';
  end if;

  update public.arcgis_jobs job
  set status = 'failed',
      retry_count = job.retry_count + 1,
      next_retry_at = null,
      last_heartbeat_at = now(),
      error_summary = jsonb_build_object('code', 'JOB_LEASE_EXPIRED'),
      worker_id = null,
      lease_expires_at = null
  where job.status = 'running'
    and coalesce(job.lease_expires_at, '-infinity'::timestamptz) <= now()
    and job.retry_count + 1 >= job.max_retries;

  return query
  with candidates as (
    select job.id
    from public.arcgis_jobs job
    join public.arcgis_connections connection on connection.id = job.connection_id
    join public.arcgis_field_mappings mapping on mapping.id = job.mapping_id
    where connection.status = 'active'
      and mapping.enabled
      and job.retry_count < job.max_retries
      and (
        job.status = 'pending'
        or (job.status in ('partial','failed') and coalesce(job.next_retry_at, now()) <= now())
        or (
          job.status = 'running'
          and coalesce(job.lease_expires_at, '-infinity'::timestamptz) <= now()
          and job.retry_count + 1 < job.max_retries
        )
      )
    order by job.created_at, job.id
    for update of job skip locked
    limit p_limit
  ), claimed as (
    update public.arcgis_jobs job
    set status = 'running',
        worker_id = p_worker_id,
        worker_started_at = now(),
        lease_expires_at = now() + make_interval(secs => p_lease_seconds),
        started_at = coalesce(job.started_at, now()),
        completed_at = null,
        next_retry_at = null,
        last_heartbeat_at = now(),
        error_summary = '{}'::jsonb,
        retry_count = case when job.status = 'running' then job.retry_count + 1 else job.retry_count end
    from candidates
    where job.id = candidates.id
    returning job.*
  )
  select claimed.* from claimed;
end;
$$;

revoke all on function public.claim_due_arcgis_jobs(text,integer,integer) from public, anon, authenticated;
grant execute on function public.claim_due_arcgis_jobs(text,integer,integer) to service_role;
