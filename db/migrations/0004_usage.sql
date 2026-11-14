-- Who is using the system, and when: account activity for the platform administrator.
--
-- Records only that an account made a request (never what it did), so the administrator can answer
-- "who was using Mylkio at this time?" and see trial, paying and lapsed accounts without reading any
-- farm records. Written by the server for the verified user; read only by platform administrators.

alter table public.profiles add column last_seen_at timestamptz;

create table public.account_activity (
  id bigint generated always as identity primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default now()
);
create index account_activity_seen_idx on public.account_activity (seen_at);
create index account_activity_user_idx on public.account_activity (user_id, seen_at desc);

-- Called on every authenticated request; cheap and idempotent. `last_seen_at` moves at most once a
-- minute and an activity row is added at most once every five minutes per account.
create function public.touch_activity(p_actor text) returns void language plpgsql as $$
begin
  update public.profiles set last_seen_at = now()
   where id = p_actor and (last_seen_at is null or last_seen_at < now() - interval '1 minute');
  if not found then return; end if;
  insert into public.account_activity (user_id)
  select p_actor
   where not exists (select 1 from public.account_activity where user_id = p_actor and seen_at > now() - interval '5 minutes');
  -- Keep about six months of history.
  if random() < 0.01 then
    delete from public.account_activity where seen_at < now() - interval '180 days';
  end if;
end $$;

-- The account list now also carries contact, farm and activity details for the usage screen.
drop function public.admin_list_accounts(text);
create function public.admin_list_accounts(p_actor text)
returns table(id text, email text, name text, phone text, role text, farm_id uuid, farm_name text, county text,
              subscription jsonb, created_at timestamptz, last_seen_at timestamptz)
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return query
    select p.id, p.email, p.name, p.phone, p.role, m.farm_id, f.data->>'name', f.data->>'county',
           s.details, p.created_at, p.last_seen_at
    from public.profiles p
    left join public.farm_memberships m on m.user_id = p.id
    left join public.farms f on f.id = m.farm_id
    left join public.subscriptions s on s.farm_id = m.farm_id
    order by p.created_at desc limit 500;
end $$;

-- A snapshot of platform usage "as at" a moment (default: now). Counts farmer accounts only.
--   * accounts created by then, and who was active in the 15 minutes, 24 hours, 7 and 30 days up to it;
--   * the accounts active in that 15-minute window;
--   * accounts by plan and subscription status, and the monthly value of the active ones. Subscription
--     status is the CURRENT one: changes are not kept as history, so it is not rewound to the chosen time;
--   * sign-ups per day (Nairobi dates) for the 14 days up to it.
create function public.admin_usage(p_actor text, p_at timestamptz default null) returns jsonb
language plpgsql stable as $$
declare at timestamptz;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  at := least(coalesce(p_at, now()), now());
  return jsonb_build_object(
    'asAt', at,
    'accounts', (select count(*) from public.profiles where role = 'farmer' and created_at <= at),
    'activeNow', (select count(distinct a.user_id) from public.account_activity a join public.profiles p on p.id = a.user_id
                   where p.role = 'farmer' and a.seen_at > at - interval '15 minutes' and a.seen_at <= at),
    'active24h', (select count(distinct a.user_id) from public.account_activity a join public.profiles p on p.id = a.user_id
                   where p.role = 'farmer' and a.seen_at > at - interval '24 hours' and a.seen_at <= at),
    'active7d', (select count(distinct a.user_id) from public.account_activity a join public.profiles p on p.id = a.user_id
                   where p.role = 'farmer' and a.seen_at > at - interval '7 days' and a.seen_at <= at),
    'active30d', (select count(distinct a.user_id) from public.account_activity a join public.profiles p on p.id = a.user_id
                   where p.role = 'farmer' and a.seen_at > at - interval '30 days' and a.seen_at <= at),
    'activeUsers', coalesce((select jsonb_agg(jsonb_build_object('id', x.user_id, 'seenAt', x.seen) order by x.seen desc)
                   from (select a.user_id, max(a.seen_at) as seen from public.account_activity a join public.profiles p on p.id = a.user_id
                          where p.role = 'farmer' and a.seen_at > at - interval '15 minutes' and a.seen_at <= at
                          group by a.user_id) x), '[]'::jsonb),
    'byStatus', coalesce((select jsonb_object_agg(x.k, x.n) from (
                   select s.details->>'status' as k, count(*) as n
                   from public.profiles p join public.farm_memberships m on m.user_id = p.id join public.subscriptions s on s.farm_id = m.farm_id
                   where p.role = 'farmer' and p.created_at <= at group by 1) x), '{}'::jsonb),
    'byPlan', coalesce((select jsonb_object_agg(x.k, x.n) from (
                   select s.details->>'plan' as k, count(*) as n
                   from public.profiles p join public.farm_memberships m on m.user_id = p.id join public.subscriptions s on s.farm_id = m.farm_id
                   where p.role = 'farmer' and p.created_at <= at group by 1) x), '{}'::jsonb),
    'monthlyValueKsh', coalesce((select sum((s.details->>'monthlyPriceKsh')::int)
                   from public.profiles p join public.farm_memberships m on m.user_id = p.id join public.subscriptions s on s.farm_id = m.farm_id
                   where p.role = 'farmer' and p.created_at <= at and s.details->>'status' = 'active'), 0),
    'signups', (select jsonb_agg(jsonb_build_object('day', x.d, 'count', x.n) order by x.d) from (
                   select g::date as d, (select count(*) from public.profiles p
                                          where p.role = 'farmer' and (p.created_at at time zone 'Africa/Nairobi')::date = g::date) as n
                   from generate_series(((at at time zone 'Africa/Nairobi')::date - 13)::timestamp,
                                        (at at time zone 'Africa/Nairobi')::date::timestamp, interval '1 day') g) x)
  );
end $$;
