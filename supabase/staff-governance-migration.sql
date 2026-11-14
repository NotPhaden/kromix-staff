-- KROMIX STAFF GOVERNANCE EXTENSION
create table if not exists public.staff_jails (
 id uuid primary key default gen_random_uuid(),
 player_id text not null,
 reason text not null,
 evidence_url text,
 officer_id uuid references public.officers(id) on delete set null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.staff_complaints (
 id uuid primary key default gen_random_uuid(),
 target_identifier text not null,
 reason text not null,
 evidence_url text,
 created_by uuid not null references auth.users(id),
 status text not null default 'Ne preluată',
 reviewed_by uuid references auth.users(id),
 reviewer_rank text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.staff_complaint_messages (
 id uuid primary key default gen_random_uuid(),
 complaint_id uuid not null references public.staff_complaints(id) on delete cascade,
 sender_id uuid not null references auth.users(id),
 message text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.staff_blacklist (
 id uuid primary key default gen_random_uuid(),
 player_id text not null,
 reason text not null,
 evidence_url text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create or replace function public.kromix_is_staff_leadership()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role in ('super_admin','commander'))
 or exists(select 1 from public.officers o join public.ranks r on r.id=o.rank_id where o.user_id=auth.uid() and r.level between 8 and 13);
$$;
alter table public.staff_jails enable row level security;
alter table public.staff_complaints enable row level security;
alter table public.staff_complaint_messages enable row level security;
alter table public.staff_blacklist enable row level security;
drop policy if exists "staff can read jail logs" on public.staff_jails;
create policy "staff can read jail logs" on public.staff_jails for select to authenticated using (true);
drop policy if exists "staff can create jail logs" on public.staff_jails;
create policy "staff can create jail logs" on public.staff_jails for insert to authenticated with check (created_by=auth.uid());
drop policy if exists "complainant and leadership read complaints" on public.staff_complaints;
create policy "complainant and leadership read complaints" on public.staff_complaints for select to authenticated using (created_by=auth.uid() or public.kromix_is_staff_leadership());
drop policy if exists "staff create own complaints" on public.staff_complaints;
create policy "staff create own complaints" on public.staff_complaints for insert to authenticated with check (created_by=auth.uid());
drop policy if exists "leadership manage complaints" on public.staff_complaints;
create policy "leadership manage complaints" on public.staff_complaints for update to authenticated using (public.kromix_is_staff_leadership()) with check (public.kromix_is_staff_leadership());
drop policy if exists "complaint participants read chat" on public.staff_complaint_messages;
create policy "complaint participants read chat" on public.staff_complaint_messages for select to authenticated using (
 exists(select 1 from public.staff_complaints c where c.id=complaint_id and (c.created_by=auth.uid() or public.kromix_is_staff_leadership()))
);
drop policy if exists "complaint participants send chat" on public.staff_complaint_messages;
create policy "complaint participants send chat" on public.staff_complaint_messages for insert to authenticated with check (
 sender_id=auth.uid() and exists(select 1 from public.staff_complaints c where c.id=complaint_id and (c.created_by=auth.uid() or public.kromix_is_staff_leadership()))
);
drop policy if exists "leadership only blacklist" on public.staff_blacklist;
create policy "leadership only blacklist" on public.staff_blacklist for all to authenticated using (public.kromix_is_staff_leadership()) with check (public.kromix_is_staff_leadership() and created_by=auth.uid());
grant select,insert on public.staff_jails to authenticated;
grant select,insert,update on public.staff_complaints to authenticated;
grant select,insert on public.staff_complaint_messages to authenticated;
grant select,insert,update,delete on public.staff_blacklist to authenticated;

-- Profile appearance: ensure both columns and a secure self-service RPC exist.
alter table public.officers add column if not exists background_url text;
create or replace function public.update_own_profile_appearance(p_avatar_url text,p_background_url text)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.officers set avatar_url=p_avatar_url, background_url=p_background_url, updated_at=now()
 where user_id=auth.uid();
 if not found then raise exception 'Nu există profil asociat contului.'; end if;
end; $$;
grant execute on function public.update_own_profile_appearance(text,text) to authenticated;

-- Monthly ticket counters per staff member and selected date.
create table if not exists public.staff_ticket_counts (
 id uuid primary key default gen_random_uuid(),
 officer_id uuid not null references public.officers(id) on delete cascade,
 ticket_date date not null,
 ticket_count integer not null check(ticket_count>=0),
 notes text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(officer_id,ticket_date)
);
alter table public.staff_ticket_counts enable row level security;
drop policy if exists "staff read ticket counters" on public.staff_ticket_counts;
create policy "staff read ticket counters" on public.staff_ticket_counts for select to authenticated using(true);
drop policy if exists "leadership manage ticket counters" on public.staff_ticket_counts;
create policy "leadership manage ticket counters" on public.staff_ticket_counts for all to authenticated using(public.kromix_is_staff_leadership()) with check(public.kromix_is_staff_leadership() and created_by=auth.uid());
grant select,insert,update,delete on public.staff_ticket_counts to authenticated;
