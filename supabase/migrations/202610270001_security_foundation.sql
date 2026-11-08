-- Supabase Auth + farm-scoped relational records for Mylkio.
-- Every operational record has its own row, stable client ID, and farm foreign key.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  phone text not null default '',
  role text not null default 'farmer' check (role in ('farmer','super_admin')),
  created_at timestamptz not null default now()
);
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now()
);
create table public.farm_memberships (
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','manager','worker','advisor')),
  created_at timestamptz not null default now(),
  primary key (farm_id,user_id), unique(user_id)
);
create table public.subscriptions (
  farm_id uuid primary key references public.farms(id) on delete cascade,
  details jsonb not null
);

create table public.cows (id text not null, farm_id uuid not null references public.farms(id) on delete cascade, data jsonb not null, primary key(farm_id,id));
create table public.buyers (id text not null, farm_id uuid not null references public.farms(id) on delete cascade, data jsonb not null, primary key(farm_id,id));
create table public.milk_entries (id text not null, farm_id uuid not null references public.farms(id) on delete cascade, data jsonb not null, primary key(farm_id,id));
create table public.deliveries (id text not null, farm_id uuid not null references public.farms(id) on delete cascade, data jsonb not null, primary key(farm_id,id));
create table public.payments (id text not null, farm_id uuid not null references public.farms(id) on delete cascade, data jsonb not null, primary key(farm_id,id));
create table public.health_events (id text not null, farm_id uuid not null references public.farms(id) on delete cascade, data jsonb not null, primary key(farm_id,id));
create table public.breeding_events (id text not null, farm_id uuid not null references public.farms(id) on delete cascade, data jsonb not null, primary key(farm_id,id));
create table public.expenses (id text not null, farm_id uuid not null references public.farms(id) on delete cascade, data jsonb not null, primary key(farm_id,id));
create table public.reminders (id text not null, farm_id uuid not null references public.farms(id) on delete cascade, data jsonb not null, primary key(farm_id,id));
create index cows_farm_idx on public.cows(farm_id);
create index milk_farm_idx on public.milk_entries(farm_id);
create index deliveries_farm_idx on public.deliveries(farm_id);
create index payments_farm_idx on public.payments(farm_id);
create index health_farm_idx on public.health_events(farm_id);
create index breeding_farm_idx on public.breeding_events(farm_id);

create table public.farm_sync_state (
  farm_id uuid not null references public.farms(id) on delete cascade,
  bucket text not null check (bucket in ('farm','cows','buyers','milk','deliveries','payments','health','breeding','expenses','reminders')),
  revision bigint not null default 0 check (revision >= 0),
  primary key(farm_id,bucket)
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  farm_id uuid not null references public.farms(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  bucket text not null,
  revision bigint not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.farm_memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.farm_sync_state enable row level security;
alter table public.audit_logs enable row level security;
alter table public.cows enable row level security;
alter table public.buyers enable row level security;
alter table public.milk_entries enable row level security;
alter table public.deliveries enable row level security;
alter table public.payments enable row level security;
alter table public.health_events enable row level security;
alter table public.breeding_events enable row level security;
alter table public.expenses enable row level security;
alter table public.reminders enable row level security;

create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='super_admin');
$$;
revoke all on function public.is_platform_admin() from public,anon;
grant execute on function public.is_platform_admin() to authenticated;

create policy profile_read on public.profiles for select to authenticated using (id=(select auth.uid()) or (select public.is_platform_admin()));
create policy membership_read on public.farm_memberships for select to authenticated using (user_id=(select auth.uid()));
create policy farm_read on public.farms for select to authenticated using (exists(select 1 from public.farm_memberships m where m.farm_id=id and m.user_id=(select auth.uid())));
create policy subscription_read on public.subscriptions for select to authenticated using ((select public.is_platform_admin()) or exists(select 1 from public.farm_memberships m where m.farm_id=subscriptions.farm_id and m.user_id=(select auth.uid())));
create policy sync_state_read on public.farm_sync_state for select to authenticated using (exists(select 1 from public.farm_memberships m where m.farm_id=farm_sync_state.farm_id and m.user_id=(select auth.uid())));
create policy audit_read on public.audit_logs for select to authenticated using ((select public.is_platform_admin()) or exists(select 1 from public.farm_memberships m where m.farm_id=audit_logs.farm_id and m.user_id=(select auth.uid())));
do $$ declare t text; begin
  foreach t in array array['cows','buyers','milk_entries','deliveries','payments','health_events','breeding_events','expenses','reminders'] loop
    execute format('create policy %I on public.%I for select to authenticated using (exists(select 1 from public.farm_memberships m where m.farm_id=%I.farm_id and m.user_id=(select auth.uid())))',t||'_read',t,t);
  end loop;
end $$;
revoke all on public.profiles,public.farms,public.farm_memberships,public.subscriptions,public.farm_sync_state,public.audit_logs,
  public.cows,public.buyers,public.milk_entries,public.deliveries,public.payments,public.health_events,public.breeding_events,public.expenses,public.reminders from anon,authenticated;
grant select on public.profiles,public.farms,public.farm_memberships,public.subscriptions,public.farm_sync_state,public.audit_logs,
  public.cows,public.buyers,public.milk_entries,public.deliveries,public.payments,public.health_events,public.breeding_events,public.expenses,public.reminders to authenticated;

create function public.provision_my_farm() returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); meta jsonb; email_address text; farm uuid; selected_plan text; price integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  if exists(select 1 from public.profiles where id=actor) then return; end if;
  select raw_user_meta_data,email into meta,email_address from auth.users where id=actor;
  if coalesce(length(btrim(meta->>'name')),0) not between 1 and 120
    or coalesce(length(btrim(meta->>'farmName')),0) not between 1 and 160
    or coalesce(length(btrim(meta->>'county')),0) not between 1 and 80
    or coalesce(length(meta->>'phone'),0)>32 or coalesce(length(meta->>'subCounty'),0)>80 then
    raise exception 'Valid farm onboarding information required' using errcode='22023';
  end if;
  selected_plan:=coalesce(meta->>'plan','farmer');
  if selected_plan not in ('starter','farmer','farm_pro') then selected_plan:='farmer'; end if;
  price:=case selected_plan when 'starter' then 500 when 'farm_pro' then 2500 else 1000 end;
  insert into public.profiles(id,email,name,phone) values(actor,email_address,btrim(meta->>'name'),coalesce(meta->>'phone',''));
  insert into public.farms(data) values(jsonb_build_object('name',btrim(meta->>'farmName'),'county',btrim(meta->>'county'),'subCounty',meta->>'subCounty',
    'ownerName',btrim(meta->>'name'),'phone',coalesce(meta->>'phone',''),'operatingStyle','individual','preferredLanguage',case when meta->>'language'='sw' then 'sw' else 'en' end,'currency','KSh','createdAt',now())) returning id into farm;
  update public.farms f set data=f.data||jsonb_build_object('id',farm) where f.id=farm;
  insert into public.farm_memberships(farm_id,user_id,role) values(farm,actor,'owner');
  insert into public.subscriptions values(farm,jsonb_build_object('plan',selected_plan,'status','trial','monthlyPriceKsh',price,'startDate',now(),'renewsAt',now()+interval '14 days'));
  insert into public.farm_sync_state(farm_id,bucket,revision) values(farm,'farm',1);
end $$;
revoke all on function public.provision_my_farm() from public,anon;
grant execute on function public.provision_my_farm() to authenticated;

create function public.write_farm_bucket(p_farm uuid,p_bucket text,p_data jsonb,p_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); table_name text; current_revision bigint; result bigint; item jsonb;
begin
  if actor is null or not exists(select 1 from public.farm_memberships where farm_id=p_farm and user_id=actor and role='owner') then raise exception 'Farm access denied' using errcode='42501'; end if;
  if p_revision is null or p_revision<0 or p_data is null or octet_length(p_data::text)>4194304 then raise exception 'Invalid data or revision' using errcode='22023'; end if;
  select revision into current_revision from public.farm_sync_state where farm_id=p_farm and bucket=p_bucket for update;
  if p_bucket='farm' then
    if jsonb_typeof(p_data)<>'object' or (p_data->>'id') is distinct from p_farm::text then raise exception 'Invalid farm record' using errcode='22023'; end if;
    if current_revision is null or current_revision<>p_revision then raise exception 'Revision conflict' using errcode='40001'; end if;
    update public.farms set data=p_data,revision=revision+1 where id=p_farm returning revision into result;
  else
    table_name:=case p_bucket when 'cows' then 'cows' when 'buyers' then 'buyers' when 'milk' then 'milk_entries'
      when 'deliveries' then 'deliveries' when 'payments' then 'payments' when 'health' then 'health_events'
      when 'breeding' then 'breeding_events' when 'expenses' then 'expenses' when 'reminders' then 'reminders' else null end;
    if table_name is null or jsonb_typeof(p_data)<>'array' then raise exception 'Invalid bucket' using errcode='22023'; end if;
    if current_revision is null then
      insert into public.farm_sync_state(farm_id,bucket,revision) values(p_farm,p_bucket,0) on conflict do nothing;
      select revision into current_revision from public.farm_sync_state where farm_id=p_farm and bucket=p_bucket for update;
    end if;
    if current_revision<>p_revision then raise exception 'Revision conflict' using errcode='40001'; end if;
    if exists(select 1 from jsonb_array_elements(p_data) x where jsonb_typeof(x)<>'object' or x->>'farmId' is distinct from p_farm::text or coalesce(length(x->>'id'),0) not between 1 and 160) then
      raise exception 'Invalid farm record identity' using errcode='22023'; end if;
    if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(p_data) x) then raise exception 'Duplicate record identity' using errcode='22023'; end if;
    execute format('delete from public.%I where farm_id=$1',table_name) using p_farm;
    for item in select value from jsonb_array_elements(p_data) loop
      execute format('insert into public.%I(id,farm_id,data) values($1,$2,$3)',table_name) using item->>'id',p_farm,item;
    end loop;
    result:=current_revision+1;
    update public.farm_sync_state set revision=result where farm_id=p_farm and bucket=p_bucket;
  end if;
  if p_bucket='farm' then update public.farm_sync_state set revision=result where farm_id=p_farm and bucket='farm'; end if;
  insert into public.audit_logs(farm_id,actor_id,action,bucket,revision) values(p_farm,actor,'bucket.write',p_bucket,result);
  return result;
end $$;
revoke all on function public.write_farm_bucket(uuid,text,jsonb,bigint) from public,anon;
grant execute on function public.write_farm_bucket(uuid,text,jsonb,bigint) to authenticated;

create function public.admin_update_subscription(p_farm uuid,p_plan text,p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare price integer;
begin
  if not public.is_platform_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if p_plan not in ('starter','farmer','farm_pro') or p_status not in ('trial','active','past_due','cancelled') then raise exception 'Invalid subscription' using errcode='22023'; end if;
  price:=case p_plan when 'starter' then 500 when 'farm_pro' then 2500 else 1000 end;
  update public.subscriptions set details=details||jsonb_build_object('plan',p_plan,'status',p_status,'monthlyPriceKsh',price) where farm_id=p_farm;
  if not found then raise exception 'Subscription missing' using errcode='22023'; end if;
  insert into public.audit_logs(farm_id,actor_id,action,bucket,revision) values(p_farm,auth.uid(),'subscription.update','subscription',0);
end $$;
revoke all on function public.admin_update_subscription(uuid,text,text) from public,anon;
grant execute on function public.admin_update_subscription(uuid,text,text) to authenticated;

create function public.admin_list_accounts()
returns table(id uuid,email text,name text,role text,farm_id uuid,subscription jsonb,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  return query select p.id,p.email,p.name,p.role,m.farm_id,s.details,p.created_at from public.profiles p
    left join public.farm_memberships m on m.user_id=p.id left join public.subscriptions s on s.farm_id=m.farm_id order by p.created_at desc limit 500;
end $$;
revoke all on function public.admin_list_accounts() from public,anon;
grant execute on function public.admin_list_accounts() to authenticated;
