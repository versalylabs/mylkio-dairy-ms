-- Website content the administrator manages: contact details, plan prices, testimonials and FAQs.
--
-- Until now these lived in the code (and, for the website's testimonials, in each visitor's own browser), so
-- changing a phone number or a price meant a code change. One small table holds them as validated JSON, keyed
-- by name. The website reads them through a public, cacheable endpoint; only a platform administrator can change
-- them, and every change keeps the previous value in a history table so a mistake can be undone by hand.
--
-- Plan prices also drive what a NEW subscription records (sign-up and plan changes). Subscriptions that already
-- exist keep the price they were given: a price edit never silently re-bills anyone.

create table public.site_content (
  key text primary key check (key in ('contact', 'prices', 'testimonials', 'faqs')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text references public.profiles(id) on delete set null
);

create table public.site_content_history (
  id bigint generated always as identity primary key,
  key text not null,
  value jsonb,
  changed_at timestamptz not null default now(),
  changed_by text references public.profiles(id) on delete set null
);
create index site_content_history_key_idx on public.site_content_history (key, changed_at desc);

-- Everything the website needs, as one object: { contact: {...}, prices: {...}, ... }. A key never saved is absent.
create function public.get_site_content() returns jsonb
language sql stable as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from public.site_content;
$$;

-- When each key was last changed and by whom (names only), for the administration screen.
create function public.admin_site_content_meta(p_actor text) returns jsonb
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_object_agg(c.key, jsonb_build_object('updatedAt', c.updated_at, 'updatedBy', p.name))
    from public.site_content c left join public.profiles p on p.id = c.updated_by), '{}'::jsonb);
end $$;

create function public.admin_set_site_content(p_actor text, p_key text, p_value jsonb) returns void
language plpgsql as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_key not in ('contact', 'prices', 'testimonials', 'faqs') or p_value is null or octet_length(p_value::text) > 100000 then
    raise exception 'Invalid site content' using errcode = '22023';
  end if;
  insert into public.site_content_history(key, value, changed_by)
    select key, value, p_actor from public.site_content where key = p_key;
  insert into public.site_content(key, value, updated_by) values (p_key, p_value, p_actor)
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
end $$;

-- Back to the built-in wording and prices: the saved value is removed (and kept in the history).
create function public.admin_reset_site_content(p_actor text, p_key text) returns void
language plpgsql as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_key not in ('contact', 'prices', 'testimonials', 'faqs') then raise exception 'Invalid site content' using errcode = '22023'; end if;
  insert into public.site_content_history(key, value, changed_by)
    select key, value, p_actor from public.site_content where key = p_key;
  delete from public.site_content where key = p_key;
end $$;

-- The monthly price of a plan: the administrator's saved price, else the built-in one.
create function public.plan_price(p_plan text) returns integer
language sql stable as $$
  select coalesce(
    (select (value ->> p_plan)::integer from public.site_content
       where key = 'prices' and (value ->> p_plan) ~ '^[0-9]{1,7}$'),
    case p_plan when 'starter' then 500 when 'farm_pro' then 2500 else 1000 end);
$$;

-- Sign-up and plan changes now record the current plan price (the two functions below are the originals with
-- only the price line changed).
create or replace function public.provision_farm(
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
  price := public.plan_price(selected_plan);

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

create or replace function public.admin_update_subscription(p_actor text, p_farm uuid, p_plan text, p_status text)
returns void language plpgsql as $$
declare price integer;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_plan not in ('starter','farmer','farm_pro') or p_status not in ('trial','active','past_due','cancelled') then
    raise exception 'Invalid subscription' using errcode = '22023';
  end if;
  price := public.plan_price(p_plan);
  update public.subscriptions
    set details = details || jsonb_build_object('plan', p_plan, 'status', p_status, 'monthlyPriceKsh', price)
    where farm_id = p_farm;
  if not found then raise exception 'Subscription missing' using errcode = '22023'; end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision)
  values (p_farm, p_actor, 'subscription.update', 'subscription', 0);
end $$;
