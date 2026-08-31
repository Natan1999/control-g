-- Control G · Plan Maestro LATAM + GIS
-- Least-privilege evidence manifest access. Field professionals may only read
-- manifests created by themselves; coordinators/support can review their entity.

drop policy if exists evidence_files_read on public.evidence_files;
create policy evidence_files_read on public.evidence_files
  for select to authenticated
  using (
    public.is_control_g_admin()
    or (
      entity_id = public.current_entity_id()
      and (
        public.current_profile_role() in ('coordinator', 'support')
        or created_by = auth.uid()
      )
    )
  );
