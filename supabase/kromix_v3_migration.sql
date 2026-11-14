-- KROMIX STAFF PANEL v3: jail records, private complaint chat, ticket statistics, profile banners.
begin;

alter table public.officers add column if not exists banner_url text;

-- Jail/warn entries concern in-game players, not necessarily staff officers.
alter table public.staff_disciplinary_records add column if not exists player_id text;
alter table public.staff_disciplinary_records alter column officer_id drop not null;

-- Monthly/manual ticket counts shown on each staff profile.
create table if not exists public.staff_ticket_stats (
 id uuid primary key default gen_random_uuid(),
 officer_id uuid not null references public.officers(id) on delete cascade,
 period_date date not null,
 ticket_count integer not null default 0 check(ticket_count >= 0),
 note text,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(officer_id,period_date)
);
alter table public.staff_ticket_stats enable row level security;
drop policy if exists "staff read ticket stats" on public.staff_ticket_stats;
create policy "staff read ticket stats" on public.staff_ticket_stats for select to authenticated using(public.is_kromix_staff());
drop policy if exists "managers manage ticket stats" on public.staff_ticket_stats;
create policy "managers manage ticket stats" on public.staff_ticket_stats for all to authenticated using(public.is_kromix_staff_manager()) with check(public.is_kromix_staff_manager());

-- Complaint chat: only the complainant and management can read it; only management can reply.
create table if not exists public.staff_complaint_messages (
 id uuid primary key default gen_random_uuid(),
 complaint_id uuid not null references public.staff_complaints(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 content text not null check(length(trim(content)) > 0),
 created_at timestamptz not null default now()
);
alter table public.staff_complaint_messages enable row level security;

drop policy if exists "staff read complaints" on public.staff_complaints;
create policy "complainant or managers read complaints" on public.staff_complaints
 for select to authenticated using(created_by=auth.uid() or public.is_kromix_staff_manager());
drop policy if exists "staff create complaints" on public.staff_complaints;
create policy "staff create own complaints" on public.staff_complaints
 for insert to authenticated with check(created_by=auth.uid() and public.is_kromix_staff());
drop policy if exists "managers manage complaints" on public.staff_complaints;
create policy "managers update complaints" on public.staff_complaints
 for update to authenticated using(public.is_kromix_staff_manager()) with check(public.is_kromix_staff_manager());
drop policy if exists "complaint participants read messages" on public.staff_complaint_messages;
create policy "complaint participants read messages" on public.staff_complaint_messages
 for select to authenticated using(
  public.is_kromix_staff_manager() or exists(
   select 1 from public.staff_complaints c where c.id=complaint_id and c.created_by=auth.uid()
  )
 );
drop policy if exists "managers reply to complaints" on public.staff_complaint_messages;
create policy "managers reply to complaints" on public.staff_complaint_messages
 for insert to authenticated with check(
  user_id=auth.uid() and public.is_kromix_staff_manager()
 );
create index if not exists staff_complaint_messages_thread_idx on public.staff_complaint_messages(complaint_id,created_at);

-- Only managers can read the full blacklist; existing manager-only policy is retained.
commit;

-- Conducerea KROMIX: Manager Staff poate administra gradele inferioare, dar nu poate
-- promova la Manager Staff sau la un grad egal/superior propriului grad.
create or replace function public.is_kromix_staff_manager()
returns boolean language sql stable security definer set search_path=public
as $$
 select public.has_role(array['super_admin','commander']) or exists (
   select 1 from public.officers o join public.ranks r on r.id=o.rank_id
   where o.user_id=auth.uid()
     and r.name in ('Fondator','Fondatoare','Co-Fondator','Manager Staff')
 );
$$;

create or replace function public.guard_staff_rank_changes()
returns trigger language plpgsql security definer set search_path=public
as $$
declare actor_level integer; target_level integer; target_name text; actor_name text;
begin
 if new.rank_id is not distinct from old.rank_id then return new; end if;
 if public.has_role(array['super_admin','commander']) then return new; end if;
 select r.level,r.name into actor_level,actor_name
 from public.officers o join public.ranks r on r.id=o.rank_id
 where o.user_id=auth.uid();
 if actor_name is null or actor_name not in ('Fondator','Fondatoare','Co-Fondator','Manager Staff') then
   raise exception 'Nu ai permisiunea de a modifica gradele staff.';
 end if;
 select level,name into target_level,target_name from public.ranks where id=new.rank_id;
 if actor_name='Manager Staff' then
   if target_level >= actor_level or target_name in ('Manager Staff','Fondator','Fondatoare','Co-Fondator') then
     raise exception 'Manager Staff poate promova doar până la un grad inferior propriului grad.';
   end if;
   if exists(select 1 from public.ranks r where r.id=old.rank_id and r.level>=actor_level) then
     raise exception 'Nu poți modifica un membru cu grad egal sau superior.';
   end if;
 end if;
 return new;
end;
$$;
drop trigger if exists protect_staff_rank_changes on public.officers;
create trigger protect_staff_rank_changes before update of rank_id on public.officers
for each row execute function public.guard_staff_rank_changes();
