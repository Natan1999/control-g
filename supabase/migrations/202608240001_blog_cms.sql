-- Blog editorial administrable desde Control G.
-- Los borradores solo son visibles para superadministradores; el contenido
-- publicado puede consultarse de forma anónima desde el sitio web.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 20 and 70),
  description text not null check (char_length(description) between 80 and 170),
  excerpt text not null check (char_length(excerpt) between 80 and 260),
  category text not null default 'Guías',
  country text not null default 'Latinoamérica',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at date not null default current_date,
  reading_minutes integer not null default 7 check (reading_minutes between 1 and 60),
  keywords text[] not null default '{}',
  whatsapp_message text not null default 'Hola, leí un artículo de Control G y quiero conocer la plataforma.',
  intro jsonb not null default '[]'::jsonb check (jsonb_typeof(intro) = 'array'),
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  comparison jsonb not null default '[]'::jsonb check (jsonb_typeof(comparison) = 'array'),
  verdict text not null default '',
  faqs jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array'),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  image_url text,
  image_alt text,
  author_name text not null default 'Equipo editorial Control G',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_date_idx on public.blog_posts(status, published_at desc);
create index if not exists blog_posts_category_idx on public.blog_posts(category);

drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at before update on public.blog_posts
for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

drop policy if exists blog_posts_public_read on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts for select to anon, authenticated
using (status = 'published' or public.is_control_g_admin());

drop policy if exists blog_posts_admin_write on public.blog_posts;
create policy blog_posts_admin_write on public.blog_posts for all to authenticated
using (public.is_control_g_admin())
with check (public.is_control_g_admin());

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images','blog-images',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists blog_images_public_read on storage.objects;
create policy blog_images_public_read on storage.objects for select to anon, authenticated
using (bucket_id = 'blog-images');

drop policy if exists blog_images_admin_insert on storage.objects;
create policy blog_images_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'blog-images' and public.is_control_g_admin());

drop policy if exists blog_images_admin_update on storage.objects;
create policy blog_images_admin_update on storage.objects for update to authenticated
using (bucket_id = 'blog-images' and public.is_control_g_admin())
with check (bucket_id = 'blog-images' and public.is_control_g_admin());

drop policy if exists blog_images_admin_delete on storage.objects;
create policy blog_images_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'blog-images' and public.is_control_g_admin());
