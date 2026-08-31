-- Governed ArcGIS attachments. A mapping must record who explicitly enabled
-- photo export; signatures and other evidence types remain excluded.

alter table public.arcgis_field_mappings
  add column if not exists attachment_authorized_at timestamptz,
  add column if not exists attachment_authorized_by uuid references auth.users(id) on delete set null;

alter table public.arcgis_field_mappings
  drop constraint if exists arcgis_mapping_attachment_authorization_check;
alter table public.arcgis_field_mappings
  add constraint arcgis_mapping_attachment_authorization_check
  check (
    attachment_policy = 'none'
    or (
      attachment_policy = 'authorized'
      and direction = 'export'
      and attachment_authorized_at is not null
      and attachment_authorized_by is not null
    )
  ) not valid;
alter table public.arcgis_field_mappings
  validate constraint arcgis_mapping_attachment_authorization_check;

alter table public.arcgis_job_items
  add column if not exists parent_source_record_id text,
  add column if not exists evidence_file_id text references public.evidence_files(id) on delete set null,
  add column if not exists remote_attachment_id text,
  add column if not exists attachment_name text,
  add column if not exists content_type text,
  add column if not exists size_bytes bigint check (size_bytes is null or size_bytes between 1 and 10485760);

create unique index if not exists arcgis_job_items_attachment_evidence_idx
  on public.arcgis_job_items(job_id, evidence_file_id)
  where operation = 'attachment' and evidence_file_id is not null;

create index if not exists arcgis_job_items_attachment_status_idx
  on public.arcgis_job_items(job_id, operation, status, created_at)
  where operation = 'attachment';
