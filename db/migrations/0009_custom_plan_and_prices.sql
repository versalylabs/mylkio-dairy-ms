-- New prices and a fourth plan, Custom.
--
--   Starter  KSh 700 / month     Farmer  KSh 1,300 / month     Farm Pro  KSh 2,800 / month
--   Custom   quoted per farm: an administrator sets the plan, a monthly price agreed with that farm, a note about what
--            was agreed, and (optionally) how many logins the farm has. A farmer cannot choose Custom at sign-up.
--
-- Additive: nothing is dropped except the old four-argument admin_update_subscription, which is replaced by a version
-- with three extra optional arguments, so a call with four arguments still works. A changed price never re-bills anyone:
-- it applies to new subscriptions, plan changes, and farms still on their free trial (nobody is paying yet).

-- The built-in price of a plan, or the administrator's saved price (Admin > Website). Custom has no list price.
create or replace function public.plan_price(p_plan text) returns integer
language sql stable as $$
  select coalesce(
    (select (value ->> p_plan)::integer from public.site_content
       where key = 'prices' and (value ->> p_plan) ~ '^[0-9]{1,7}$'),
    case p_plan when 'starter' then 700 when 'farm_pro' then 2800 when 'custom' then 0 else 1300 end);
$$;

-- If an administrator had saved prices that are still exactly the old built-in ones, move them to the new ones.
-- (A price someone chose on purpose is left alone.)
update public.site_content
   set value = jsonb_build_object('starter', 700, 'farmer', 1300, 'farm_pro', 2800), updated_at = now()
 where key = 'prices' and value = jsonb_build_object('starter', 500, 'farmer', 1000, 'farm_pro', 2500);

-- Farms still on their free trial are shown the new price. Paying farms keep what they were given.
update public.subscriptions
   set details = details || jsonb_build_object('monthlyPriceKsh', public.plan_price(details ->> 'plan'))
 where details ->> 'status' = 'trial' and details ->> 'plan' in ('starter', 'farmer', 'farm_pro');

-- Logins a farm has. Farm Pro and Custom default to six (the owner plus five); a Custom farm may have its own number.
create or replace function public.team_limit(p_plan text) returns integer
language sql immutable as $$
  select case p_plan when 'farm_pro' then 6 when 'custom' then 6 else 1 end;
$$;

create function public.team_limit_for_farm(p_farm uuid) returns integer
language sql stable as $$
  select case
    when s.details ->> 'plan' = 'custom' and (s.details ->> 'teamLimit') ~ '^[0-9]{1,3}$' and (s.details ->> 'teamLimit')::int >= 1
      then (s.details ->> 'teamLimit')::int
    else public.team_limit(s.details ->> 'plan') end
  from public.subscriptions s where s.farm_id = p_farm;
$$;

-- The three team functions below are the 0008 originals with only the limit lookup changed.
create or replace function public.list_farm_team(p_actor text, p_farm uuid) returns jsonb
language plpgsql stable as $$
begin
  if public.farm_role(p_actor, p_farm) is distinct from 'owner' then raise exception 'Owner access required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'limit', coalesce(public.team_limit_for_farm(p_farm), 1),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.user_id, 'name', p.name, 'email', p.email, 'phone', p.phone, 'role', m.role,
                                          'joinedAt', m.created_at, 'lastSeenAt', p.last_seen_at)
                       order by (m.role = 'owner') desc, m.created_at)
      from public.farm_memberships m join public.profiles p on p.id = m.user_id where m.farm_id = p_farm), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'role', i.role, 'label', i.label, 'createdAt', i.created_at, 'expiresAt', i.expires_at)
                       order by i.created_at desc)
      from public.farm_invites i
      where i.farm_id = p_farm and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()), '[]'::jsonb));
end $$;

create or replace function public.create_farm_invite(p_actor text, p_farm uuid, p_role text, p_label text, p_code text) returns uuid
language plpgsql as $$
declare taken integer; created uuid;
begin
  if public.farm_role(p_actor, p_farm) is distinct from 'owner' then raise exception 'Owner access required' using errcode = '42501'; end if;
  if p_role not in ('manager', 'worker') or coalesce(length(p_label), 0) > 80
     or length(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) < 8 then
    raise exception 'Invalid invitation' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_farm::text, 2));
  select (select count(*) from public.farm_memberships where farm_id = p_farm)
       + (select count(*) from public.farm_invites where farm_id = p_farm and accepted_at is null and revoked_at is null and expires_at > now())
    into taken;
  if taken >= coalesce(public.team_limit_for_farm(p_farm), 1) then raise exception 'Team full for this plan' using errcode = 'MY402'; end if;
  insert into public.farm_invites(farm_id, role, label, token_hash, created_by, expires_at)
  values (p_farm, p_role, nullif(btrim(coalesce(p_label, '')), ''), public.invite_hash(p_code), p_actor, now() + interval '7 days')
  returning id into created;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (p_farm, p_actor, 'team.invite', 'team', 0, created::text);
  return created;
end $$;

create or replace function public.accept_farm_invite(p_actor text, p_email text, p_name text, p_phone text, p_code text) returns uuid
language plpgsql as $$
declare inv public.farm_invites%rowtype; members integer;
begin
  if p_actor is null or length(p_actor) not between 1 and 200 then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor, 0));
  if exists (select 1 from public.farm_memberships where user_id = p_actor) then raise exception 'Already in a farm' using errcode = '23505'; end if;
  if coalesce(length(btrim(p_name)), 0) not between 1 and 120 or coalesce(length(p_phone), 0) > 32
     or coalesce(length(p_email), 0) not between 3 and 254 then
    raise exception 'Valid details required' using errcode = '22023';
  end if;
  select * into inv from public.farm_invites
    where token_hash = public.invite_hash(p_code) and accepted_at is null and revoked_at is null and expires_at > now()
    for update;
  if not found then raise exception 'Invitation not valid' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(inv.farm_id::text, 2));
  select count(*) into members from public.farm_memberships where farm_id = inv.farm_id;
  if members >= coalesce(public.team_limit_for_farm(inv.farm_id), 1) then raise exception 'Team full for this plan' using errcode = 'MY402'; end if;
  insert into public.profiles(id, email, name, phone) values (p_actor, lower(btrim(p_email)), btrim(p_name), coalesce(p_phone, ''))
    on conflict (id) do nothing;
  insert into public.farm_memberships(farm_id, user_id, role) values (inv.farm_id, p_actor, inv.role);
  update public.farm_invites set accepted_by = p_actor, accepted_at = now() where id = inv.id;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (inv.farm_id, p_actor, 'team.join', 'team', 0, inv.id::text);
  return inv.farm_id;
end $$;

-- An administrator changes a farm's plan and status. For a Custom plan they also give the monthly price agreed with
-- that farm, a note of what was agreed, and optionally the number of logins. For any other plan the price is the plan's
-- price and any Custom details are cleared. Changing only the status of a Custom farm keeps its price, note and limit.
drop function public.admin_update_subscription(text, uuid, text, text);
create function public.admin_update_subscription(
  p_actor text, p_farm uuid, p_plan text, p_status text,
  p_price integer default null, p_note text default null, p_team_limit integer default null
) returns void language plpgsql as $$
declare current jsonb; price integer; note text; team integer;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_plan not in ('starter','farmer','farm_pro','custom') or p_status not in ('trial','active','past_due','cancelled') then
    raise exception 'Invalid subscription' using errcode = '22023';
  end if;
  select details into current from public.subscriptions where farm_id = p_farm;
  if not found then raise exception 'Subscription missing' using errcode = '22023'; end if;

  if p_plan = 'custom' then
    price := coalesce(p_price, case when current ->> 'plan' = 'custom' then (current ->> 'monthlyPriceKsh')::integer end);
    if price is null or price < 1 or price > 1000000 then
      raise exception 'A Custom plan needs the monthly price agreed with the farm' using errcode = '22023';
    end if;
    note := case when p_note is not null then nullif(btrim(p_note), '') else current ->> 'customNote' end;
    if coalesce(length(note), 0) > 500 then raise exception 'Note is too long' using errcode = '22023'; end if;
    team := coalesce(p_team_limit, case when current ->> 'plan' = 'custom' then (current ->> 'teamLimit')::integer end);
    if team is not null and team not between 1 and 100 then raise exception 'Team size must be 1 to 100' using errcode = '22023'; end if;
    update public.subscriptions
      set details = (details - 'customNote' - 'teamLimit') || jsonb_strip_nulls(jsonb_build_object(
        'plan', p_plan, 'status', p_status, 'monthlyPriceKsh', price, 'customNote', note, 'teamLimit', team))
      where farm_id = p_farm;
  else
    update public.subscriptions
      set details = (details - 'customNote' - 'teamLimit') || jsonb_build_object(
        'plan', p_plan, 'status', p_status, 'monthlyPriceKsh', public.plan_price(p_plan))
      where farm_id = p_farm;
  end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision)
  values (p_farm, p_actor, 'subscription.update', 'subscription', 0);
end $$;
