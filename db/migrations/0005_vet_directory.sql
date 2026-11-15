-- Vets and animal health workers: each farm's own contacts, and a shared directory that only shows an
-- entry once a person has rung the number and confirmed it.
--
-- Two separate things:
--   * farm_vet_contacts: private to one farm. "My vet", saved so it is one tap away in an emergency.
--   * vet_providers: the shared directory. Anyone signed in can SUGGEST an entry (status 'pending').
--     A platform administrator rings the number and confirms it ('confirmed', with the date), or rejects
--     it. Only confirmed entries are ever shown to farmers.
-- The Next.js server verifies the session and the plan; these functions re-check farm membership and
-- administrator rights, like the rest of the backend.

-- The last nine digits identify a Kenyan number however it is written (0712 345 678, +254712345678).
create function public.phone_key(p_phone text) returns text
language sql immutable as $$
  select right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 9);
$$;

create function public.is_farm_member(p_actor text, p_farm uuid) returns boolean
language sql stable as $$
  select exists(select 1 from public.farm_memberships where farm_id = p_farm and user_id = p_actor);
$$;

create table public.farm_vet_contacts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 120),
  kind text not null check (kind in ('veterinarian','animal_health_assistant','co_op_vet','agrovet','clinic')),
  phone text not null check (length(regexp_replace(phone, '[^0-9]', '', 'g')) between 9 and 15),
  notes text check (notes is null or length(notes) <= 300),
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index farm_vet_contacts_farm_idx on public.farm_vet_contacts (farm_id);

create table public.vet_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  kind text not null check (kind in ('veterinarian','animal_health_assistant','co_op_vet','agrovet','clinic')),
  county text not null check (length(btrim(county)) between 2 and 80),
  areas text check (areas is null or length(areas) <= 300),
  phone text not null check (length(regexp_replace(phone, '[^0-9]', '', 'g')) between 9 and 15),
  whatsapp boolean not null default false,
  emergency boolean not null default false,
  hours text check (hours is null or length(hours) <= 120),
  kvb_reg_no text check (kvb_reg_no is null or length(kvb_reg_no) <= 40),
  notes text check (notes is null or length(notes) <= 500),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','hidden')),
  -- The day someone rang this number and confirmed it reaches this person or service.
  confirmed_on date,
  source text not null default 'farmer' check (source in ('admin','farmer')),
  submitted_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'confirmed' or confirmed_on is not null)
);
create index vet_providers_county_idx on public.vet_providers (lower(county), status);
-- One live entry per number, so repeated suggestions of the same vet do not pile up.
create unique index vet_providers_phone_live_idx on public.vet_providers (public.phone_key(phone)) where status in ('pending', 'confirmed');

-- ───────────── A farm's own contacts ─────────────

create function public.list_my_vets(p_actor text, p_farm uuid) returns setof public.farm_vet_contacts
language plpgsql stable as $$
begin
  if not public.is_farm_member(p_actor, p_farm) then raise exception 'Not a member of this farm' using errcode = '42501'; end if;
  return query select * from public.farm_vet_contacts where farm_id = p_farm order by created_at limit 20;
end $$;

create function public.add_my_vet(p_actor text, p_farm uuid, p_name text, p_kind text, p_phone text, p_notes text)
returns uuid language plpgsql as $$
declare existing uuid; created uuid;
begin
  if not public.is_farm_member(p_actor, p_farm) then raise exception 'Not a member of this farm' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_name)), 0) not between 2 and 120
     or p_kind not in ('veterinarian','animal_health_assistant','co_op_vet','agrovet','clinic')
     or length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) not between 9 and 15
     or length(coalesce(p_notes, '')) > 300 then
    raise exception 'A name, a kind and a usable phone number are required' using errcode = '22023';
  end if;
  -- The same number saved twice is the same contact.
  select id into existing from public.farm_vet_contacts where farm_id = p_farm and public.phone_key(phone) = public.phone_key(p_phone);
  if found then return existing; end if;
  if (select count(*) from public.farm_vet_contacts where farm_id = p_farm) >= 10 then
    raise exception 'A farm can save up to 10 vet contacts' using errcode = '22023';
  end if;
  insert into public.farm_vet_contacts (farm_id, name, kind, phone, notes, created_by)
  values (p_farm, btrim(p_name), p_kind, btrim(p_phone), nullif(btrim(coalesce(p_notes, '')), ''), p_actor)
  returning id into created;
  return created;
end $$;

create function public.remove_my_vet(p_actor text, p_farm uuid, p_id uuid) returns void
language plpgsql as $$
begin
  if not public.is_farm_member(p_actor, p_farm) then raise exception 'Not a member of this farm' using errcode = '42501'; end if;
  delete from public.farm_vet_contacts where id = p_id and farm_id = p_farm;
end $$;

-- ───────────── The shared directory ─────────────

-- Confirmed entries in a county. Any signed-in account may call this; the server decides who gets the finder.
create function public.list_vet_directory(p_actor text, p_county text)
returns table(id uuid, name text, kind text, county text, areas text, phone text, whatsapp boolean, emergency boolean,
              hours text, kvb_reg_no text, notes text, confirmed_on date)
language plpgsql stable as $$
begin
  if not exists(select 1 from public.profiles where profiles.id = p_actor) then raise exception 'Account required' using errcode = '42501'; end if;
  return query
    select v.id, v.name, v.kind, v.county, v.areas, v.phone, v.whatsapp, v.emergency, v.hours, v.kvb_reg_no, v.notes, v.confirmed_on
    from public.vet_providers v
    where v.status = 'confirmed' and lower(btrim(v.county)) = lower(btrim(coalesce(p_county, '')))
    order by v.emergency desc, v.confirmed_on desc, v.name
    limit 100;
end $$;

-- Anyone signed in with a farm can suggest a vet. It stays hidden until an administrator confirms it.
create function public.suggest_vet(
  p_actor text, p_name text, p_kind text, p_county text, p_areas text, p_phone text,
  p_whatsapp boolean, p_emergency boolean, p_hours text, p_kvb text, p_notes text
) returns uuid language plpgsql as $$
declare existing uuid; created uuid;
begin
  if not exists(select 1 from public.farm_memberships where user_id = p_actor) then raise exception 'A farm account is required' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_name)), 0) not between 2 and 120
     or p_kind not in ('veterinarian','animal_health_assistant','co_op_vet','agrovet','clinic')
     or coalesce(length(btrim(p_county)), 0) not between 2 and 80
     or length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) not between 9 and 15
     or length(coalesce(p_areas, '')) > 300 or length(coalesce(p_hours, '')) > 120
     or length(coalesce(p_kvb, '')) > 40 or length(coalesce(p_notes, '')) > 500 then
    raise exception 'A name, a kind, a county and a usable phone number are required' using errcode = '22023';
  end if;
  select id into existing from public.vet_providers where status in ('pending', 'confirmed') and public.phone_key(phone) = public.phone_key(p_phone);
  if found then return existing; end if;
  -- Five suggestions a day per account.
  if (select count(*) from public.vet_providers where submitted_by = p_actor and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Too many suggestions' using errcode = 'MY429';
  end if;
  insert into public.vet_providers (name, kind, county, areas, phone, whatsapp, emergency, hours, kvb_reg_no, notes, source, submitted_by)
  values (btrim(p_name), p_kind, btrim(p_county), nullif(btrim(coalesce(p_areas, '')), ''), btrim(p_phone), coalesce(p_whatsapp, false), coalesce(p_emergency, false),
          nullif(btrim(coalesce(p_hours, '')), ''), nullif(btrim(coalesce(p_kvb, '')), ''), nullif(btrim(coalesce(p_notes, '')), ''), 'farmer', p_actor)
  returning id into created;
  return created;
end $$;

-- ───────────── Administration ─────────────

create function public.admin_list_vets(p_actor text, p_status text default null)
returns table(id uuid, name text, kind text, county text, areas text, phone text, whatsapp boolean, emergency boolean, hours text,
              kvb_reg_no text, notes text, status text, confirmed_on date, source text, submitted_by_name text, created_at timestamptz)
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return query
    select v.id, v.name, v.kind, v.county, v.areas, v.phone, v.whatsapp, v.emergency, v.hours, v.kvb_reg_no, v.notes, v.status,
           v.confirmed_on, v.source, p.name, v.created_at
    from public.vet_providers v left join public.profiles p on p.id = v.submitted_by
    where p_status is null or v.status = p_status
    order by (v.status = 'pending') desc, v.created_at desc
    limit 500;
end $$;

-- Adds a new entry (p_id null) or edits one. An administrator confirming an entry gives the day they rang it.
create function public.admin_save_vet(
  p_actor text, p_id uuid, p_name text, p_kind text, p_county text, p_areas text, p_phone text,
  p_whatsapp boolean, p_emergency boolean, p_hours text, p_kvb text, p_notes text, p_status text, p_confirmed_on date
) returns uuid language plpgsql as $$
declare saved uuid;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_name)), 0) not between 2 and 120
     or p_kind not in ('veterinarian','animal_health_assistant','co_op_vet','agrovet','clinic')
     or coalesce(length(btrim(p_county)), 0) not between 2 and 80
     or length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) not between 9 and 15
     or p_status not in ('pending','confirmed','rejected','hidden')
     or (p_status = 'confirmed' and (p_confirmed_on is null or p_confirmed_on > current_date))
     or length(coalesce(p_areas, '')) > 300 or length(coalesce(p_hours, '')) > 120
     or length(coalesce(p_kvb, '')) > 40 or length(coalesce(p_notes, '')) > 500 then
    raise exception 'Invalid vet entry' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.vet_providers (name, kind, county, areas, phone, whatsapp, emergency, hours, kvb_reg_no, notes, status, confirmed_on, source)
    values (btrim(p_name), p_kind, btrim(p_county), nullif(btrim(coalesce(p_areas, '')), ''), btrim(p_phone), coalesce(p_whatsapp, false), coalesce(p_emergency, false),
            nullif(btrim(coalesce(p_hours, '')), ''), nullif(btrim(coalesce(p_kvb, '')), ''), nullif(btrim(coalesce(p_notes, '')), ''), p_status,
            case when p_status = 'confirmed' then p_confirmed_on end, 'admin')
    returning id into saved;
  else
    update public.vet_providers set
      name = btrim(p_name), kind = p_kind, county = btrim(p_county), areas = nullif(btrim(coalesce(p_areas, '')), ''), phone = btrim(p_phone),
      whatsapp = coalesce(p_whatsapp, false), emergency = coalesce(p_emergency, false), hours = nullif(btrim(coalesce(p_hours, '')), ''),
      kvb_reg_no = nullif(btrim(coalesce(p_kvb, '')), ''), notes = nullif(btrim(coalesce(p_notes, '')), ''), status = p_status,
      confirmed_on = case when p_status = 'confirmed' then p_confirmed_on end, updated_at = now()
    where id = p_id returning id into saved;
    if saved is null then raise exception 'Vet entry not found' using errcode = '22023'; end if;
  end if;
  return saved;
end $$;

create function public.admin_set_vet_status(p_actor text, p_id uuid, p_status text, p_confirmed_on date) returns void
language plpgsql as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_status not in ('pending','confirmed','rejected','hidden') or (p_status = 'confirmed' and (p_confirmed_on is null or p_confirmed_on > current_date)) then
    raise exception 'Invalid status' using errcode = '22023';
  end if;
  update public.vet_providers set status = p_status, confirmed_on = case when p_status = 'confirmed' then p_confirmed_on end, updated_at = now() where id = p_id;
  if not found then raise exception 'Vet entry not found' using errcode = '22023'; end if;
end $$;
