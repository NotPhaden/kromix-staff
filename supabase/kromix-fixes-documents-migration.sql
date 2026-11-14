-- KROMIX Staff Panel: remedieri registre + pagini informative
-- Rulează în Supabase SQL Editor.

-- Coloane lipsă pentru registrul Jaill.
alter table public.staff_disciplinary_records
  add column if not exists player_id text;
alter table public.staff_disciplinary_records
  add column if not exists jail_duration text;

-- Documente editabile de conducere, vizibile tuturor membrilor autentificați.
create table if not exists public.staff_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('regulament','sanctiuni')),
  title text not null,
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.staff_documents enable row level security;

drop policy if exists "staff can read staff documents" on public.staff_documents;
create policy "staff can read staff documents"
  on public.staff_documents for select to authenticated
  using (public.is_kromix_staff());

drop policy if exists "management can insert staff documents" on public.staff_documents;
create policy "management can insert staff documents"
  on public.staff_documents for insert to authenticated
  with check (
    public.is_kromix_staff()
    and exists (
      select 1 from public.officers o
      where o.user_id = auth.uid()
        and o.rank_id in (select r.id from public.ranks r
          where r.name in ('Fondator','Fondatoare','Co-Fondator','Manager Staff'))
    )
  );

drop policy if exists "management can update staff documents" on public.staff_documents;
create policy "management can update staff documents"
  on public.staff_documents for update to authenticated
  using (
    public.is_kromix_staff()
    and exists (
      select 1 from public.officers o
      where o.user_id = auth.uid()
        and o.rank_id in (select r.id from public.ranks r
          where r.name in ('Fondator','Fondatoare','Co-Fondator','Manager Staff'))
    )
  )
  with check (
    public.is_kromix_staff()
    and exists (
      select 1 from public.officers o
      where o.user_id = auth.uid()
        and o.rank_id in (select r.id from public.ranks r
          where r.name in ('Fondator','Fondatoare','Co-Fondator','Manager Staff'))
    )
  );

grant select, insert, update on public.staff_documents to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Notifică PostgREST să reîncarce schema după adăugarea coloanelor.
notify pgrst, 'reload schema';
