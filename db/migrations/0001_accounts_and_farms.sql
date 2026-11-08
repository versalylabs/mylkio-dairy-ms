-- Accounts, farms and memberships for Mylkio on Neon.
--
-- Identity comes from Neon Auth (managed Better Auth). The Next.js server verifies the
-- session cookie, then passes the user's id to these functions as `p_actor`. The
-- database never trusts a browser: only the server holds DATABASE_URL, and every
-- function that touches farm data re-checks that `p_actor` belongs to that farm.
--
-- `profiles.id` stores the Neon Auth user id as text. It is deliberately not a foreign
-- key into the neon_auth schema, so this schema does not depend on how Neon Auth lays
-- out its own tables.

create table public.profiles (
  id text primary key check (length(id) between 1 and 200),
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
  user_id text not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','manager','worker','advisor')),
  created_at timestamptz not null default now(),
  primary key (farm_id, user_id),
  unique (user_id)
);

create table public.subscriptions (
  farm_id uuid primary key references public.farms(id) on delete cascade,
  details jsonb not null
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  farm_id uuid not null references public.farms(id) on delete cascade,
  actor_id text not null references public.profiles(id),
  action text not null,
  bucket text not null,
  revision bigint not null,
  record_id text,
  created_at timestamptz not null default now()
);
create index audit_logs_farm_idx on public.audit_logs(farm_id, id);

-- One versioned row per farm record, with tombstones for deletes and a per-farm change
-- sequence so devices download only what changed. Written only by apply_farm_operations
-- (see 0002_record_sync.sql); the farm's own profile is its first record.
create table public.farm_records (
  farm_id uuid not null references public.farms(id) on delete cascade,
  bucket text not null check (bucket in ('farm','cows','buyers','milk','deliveries','payments','health','breeding','expenses','reminders','statements','bills','allocations')),
  id text not null check (length(id) between 1 and 160),
  version bigint not null default 1 check (version >= 1),
  change_seq bigint not null,
  deleted boolean not null default false,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text references public.profiles(id),
  primary key (farm_id, bucket, id)
);
create index farm_records_changes_idx on public.farm_records(farm_id, change_seq);
create sequence public.farm_record_change_seq;

-- Platform administrators are promoted out-of-band with a narrowly scoped SQL update
-- (see docs/neon-backend.md). No public API can create or elevate one.
create function public.is_platform_admin(p_actor text) returns boolean
language sql stable as $$
  select exists(select 1 from public.profiles where id = p_actor and role = 'super_admin');
$$;

-- Creates the caller's profile, farm, owner membership, trial subscription and farm
-- profile record. Safe to call again: an existing farm is returned unchanged.
create function public.provision_farm(
  p_actor text, p_email text, p_name text, p_phone text,
  p_farm_name text, p_county text, p_sub_county text, p_plan text, p_language text
) returns uuid language plpgsql as $$
declare farm uuid; selected_plan text; price integer;
begin
  if p_actor is null or length(p_actor) not between 1 and 200 then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor, 0));
  select farm_id into farm from public.farm_memberships where user_id = p_actor;
  if found then return farm; end if;

  if coalesce(length(btrim(p_name)), 0) not between 1 and 120
    or coalesce(length(btrim(p_farm_name)), 0) not between 1 and 160
    or coalesce(length(btrim(p_county)), 0) not between 1 and 80
    or coalesce(length(p_phone), 0) > 32 or coalesce(length(p_sub_county), 0) > 80
    or coalesce(length(p_email), 0) not between 3 and 254 then
    raise exception 'Valid farm onboarding information required' using errcode = '22023';
  end if;

  selected_plan := coalesce(p_plan, 'farmer');
  if selected_plan not in ('starter','farmer','farm_pro') then selected_plan := 'farmer'; end if;
  price := case selected_plan when 'starter' then 500 when 'farm_pro' then 2500 else 1000 end;

  insert into public.profiles(id, email, name, phone)
  values (p_actor, lower(btrim(p_email)), btrim(p_name), coalesce(p_phone, ''))
  on conflict (id) do nothing;

  insert into public.farms(data) values (jsonb_build_object(
    'name', btrim(p_farm_name), 'county', btrim(p_county), 'subCounty', nullif(btrim(coalesce(p_sub_county, '')), ''),
    'ownerName', btrim(p_name), 'phone', coalesce(p_phone, ''), 'operatingStyle', 'individual',
    'preferredLanguage', case when p_language = 'sw' then 'sw' else 'en' end,
    'currency', 'KSh', 'createdAt', now())) returning id into farm;
  update public.farms f set data = f.data || jsonb_build_object('id', farm) where f.id = farm;

  insert into public.farm_memberships(farm_id, user_id, role) values (farm, p_actor, 'owner');
  insert into public.subscriptions values (farm, jsonb_build_object(
    'plan', selected_plan, 'status', 'trial', 'monthlyPriceKsh', price,
    'startDate', now(), 'renewsAt', now() + interval '14 days'));
  insert into public.farm_records(farm_id, bucket, id, version, change_seq, data, updated_by)
  select farm, 'farm', farm::text, 1, nextval('public.farm_record_change_seq'), f.data, p_actor
  from public.farms f where f.id = farm;
  return farm;
end $$;

-- The signed-in user's profile, farm id and subscription, or null before onboarding.
create function public.get_account(p_actor text) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', p.id, 'email', p.email, 'name', p.name, 'phone', p.phone, 'role', p.role,
    'createdAt', p.created_at, 'farmId', m.farm_id, 'subscription', s.details)
  from public.profiles p
  left join public.farm_memberships m on m.user_id = p.id
  left join public.subscriptions s on s.farm_id = m.farm_id
  where p.id = p_actor;
$$;

create function public.admin_list_accounts(p_actor text)
returns table(id text, email text, name text, role text, farm_id uuid, subscription jsonb, created_at timestamptz)
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return query
    select p.id, p.email, p.name, p.role, m.farm_id, s.details, p.created_at
    from public.profiles p
    left join public.farm_memberships m on m.user_id = p.id
    left join public.subscriptions s on s.farm_id = m.farm_id
    order by p.created_at desc limit 500;
end $$;

create function public.admin_update_subscription(p_actor text, p_farm uuid, p_plan text, p_status text)
returns void language plpgsql as $$
declare price integer;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_plan not in ('starter','farmer','farm_pro') or p_status not in ('trial','active','past_due','cancelled') then
    raise exception 'Invalid subscription' using errcode = '22023';
  end if;
  price := case p_plan when 'starter' then 500 when 'farm_pro' then 2500 else 1000 end;
  update public.subscriptions
    set details = details || jsonb_build_object('plan', p_plan, 'status', p_status, 'monthlyPriceKsh', price)
    where farm_id = p_farm;
  if not found then raise exception 'Subscription missing' using errcode = '22023'; end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision)
  values (p_farm, p_actor, 'subscription.update', 'subscription', 0);
end $$;
