-- CONTROL DE CAMBIO MANUAL · NO EJECUTAR SIN VENTANA DE MANTENIMIENTO
--
-- Requisitos previos:
-- 1. Confirmar que Auth MFA/TOTP está habilitado en la instancia Supabase.
-- 2. Comunicar el cambio a administración, coordinación y apoyo.
-- 3. Enrolar y verificar por lo menos dos administradores de recuperación.
-- 4. Probar AAL2 y rollback en una entidad piloto.
-- 5. Activar entities.require_mfa_for_privileged solo después del piloto.
--
-- La interfaz Control G ya guía enrolamiento y challenge. Este script agrega
-- la imposición no eludible en RLS para entidades que activen la bandera.

create or replace function public.requires_aal2_for_entity(target_entity_id text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce((
    select
      entity.require_mfa_for_privileged
      and profile.role in ('admin', 'coordinator', 'support')
      and coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2'
    from public.entities entity
    cross join public.user_profiles profile
    where entity.id = target_entity_id
      and profile.user_id = auth.uid()
      and profile.status = 'active'
    limit 1
  ), false);
$$;

revoke all on function public.requires_aal2_for_entity(text) from public, anon;
grant execute on function public.requires_aal2_for_entity(text) to authenticated;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'entity_municipalities', 'professional_assignments', 'form_assignments',
    'families', 'activities', 'observations', 'forms', 'form_versions',
    'form_responses', 'audit_log', 'sync_log', 'map_layers', 'evidence_files',
    'indicator_definitions', 'indicator_snapshots', 'report_runs',
    'arcgis_connections', 'arcgis_jobs', 'consent_records',
    'retention_policies', 'sensitive_access_log'
  ] loop
    execute format('drop policy if exists privileged_mfa_restrict on public.%I', target_table);
    execute format(
      'create policy privileged_mfa_restrict on public.%I as restrictive for all to authenticated using (not public.requires_aal2_for_entity(entity_id)) with check (not public.requires_aal2_for_entity(entity_id))',
      target_table
    );
  end loop;
end;
$$;
