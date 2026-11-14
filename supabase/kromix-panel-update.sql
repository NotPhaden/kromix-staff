-- KROMIX STAFF PANEL: fixes for profile media, ticket history and complaint conversations.
alter table public.officers add column if not exists banner_url text;
grant update (banner_url) on public.officers to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('staff-avatars','staff-avatars',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "staff avatar public read" on storage.objects;
create policy "staff avatar public read" on storage.objects for select to public using(bucket_id='staff-avatars');
drop policy if exists "staff avatar owner upload" on storage.objects;
create policy "staff avatar owner upload" on storage.objects for insert to authenticated
 with check(bucket_id='staff-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "staff avatar owner update" on storage.objects;
create policy "staff avatar owner update" on storage.objects for update to authenticated
 using(bucket_id='staff-avatars' and (storage.foldername(name))[1]=auth.uid()::text)
 with check(bucket_id='staff-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create table if not exists public.staff_ticket_stats (
 id uuid primary key default gen_random_uuid(),
 officer_id uuid not null references public.officers(id) on delete cascade,
 period_date date not null,
 ticket_count integer not null default 0 check(ticket_count>=0),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(officer_id,period_date)
);
alter table public.staff_ticket_stats enable row level security;
drop policy if exists "staff read ticket stats" on public.staff_ticket_stats;
create policy "staff read ticket stats" on public.staff_ticket_stats for select to authenticated using(public.is_kromix_staff());
drop policy if exists "managers manage ticket stats" on public.staff_ticket_stats;
create policy "managers manage ticket stats" on public.staff_ticket_stats for all to authenticated
 using(public.is_kromix_staff_manager()) with check(public.is_kromix_staff_manager() and created_by=auth.uid());
grant select,insert,update,delete on public.staff_ticket_stats to authenticated;

alter table public.staff_complaints add column if not exists reviewer_rank text;
create table if not exists public.staff_complaint_messages (
 id uuid primary key default gen_random_uuid(),
 complaint_id uuid not null references public.staff_complaints(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 content text not null,
 created_at timestamptz not null default now()
);
alter table public.staff_complaint_messages enable row level security;
drop policy if exists "staff read complaints" on public.staff_complaints;
create policy "complainant and managers read complaints" on public.staff_complaints
 for select to authenticated using(created_by=auth.uid() or public.is_kromix_staff_manager());
drop policy if exists "staff create complaints" on public.staff_complaints;
create policy "staff create own complaints" on public.staff_complaints
 for insert to authenticated with check(created_by=auth.uid() and public.is_kromix_staff());
drop policy if exists "complaint participants read messages" on public.staff_complaint_messages;
create policy "complaint participants read messages" on public.staff_complaint_messages
 for select to authenticated using(exists(select 1 from public.staff_complaints c where c.id=complaint_id and (c.created_by=auth.uid() or public.is_kromix_staff_manager())));
drop policy if exists "complaint participants send messages" on public.staff_complaint_messages;
create policy "complaint participants send messages" on public.staff_complaint_messages
 for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.staff_complaints c where c.id=complaint_id and (c.created_by=auth.uid() or public.is_kromix_staff_manager())));
grant select,insert on public.staff_complaint_messages to authenticated;

do $$ begin alter publication supabase_realtime add table public.staff_complaint_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Allow every authenticated staff member to record a Jail applied in-game for a player.
drop policy if exists "staff create own discipline record" on public.staff_disciplinary_records;
create policy "staff create own discipline record" on public.staff_disciplinary_records
 for insert to authenticated with check(
  created_by=auth.uid() and public.is_kromix_staff()
  and exists(select 1 from public.officers o where o.id=officer_id and o.user_id=auth.uid())
 );
grant select,insert on public.staff_disciplinary_records to authenticated;
