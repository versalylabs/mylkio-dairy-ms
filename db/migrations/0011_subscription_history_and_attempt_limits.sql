-- Two things, both additive.
--
-- 1. A history of every plan, price and status change made by hand in the administration screens, shown on the
--    account. Until now the change itself was kept nowhere (only that "a subscription was updated"). It matters more
--    now that a Custom farm has its own agreed price. A payment that moves the status or the paid-until date, and the
--    voiding of one, are logged too, so the account tells the whole story of how it came to be where it is.
--
-- 2. A limit on how often a wrong invitation code can be tried: per account and per network address (kept only as a
--    hash). Applies to the pilot's farm-start codes and to team invitation codes. The attempts are recorded by the
--    server after a wrong code, so they are not lost when the failed request rolls back.
--
-- It also fixes a gap left by the Custom plan (0009): a payment could not be recorded for a Custom farm because the
-- payment ledger only knew the three self-serve plans.

-- ---- 1. History -------------------------------------------------------------------------------------------------

create table public.subscription_changes (
  id bigint generated always as identity primary key,
  farm_id uuid not null references public.farms(id) on delete cascade,
  changed_by text references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  -- 'admin' (a plan, price or status set by hand), 'payment' or 'payment_void'
  source text not null check (source in ('admin', 'payment', 'payment_void')),
  before jsonb not null,
  after jsonb not null
);
create index subscription_changes_farm_idx on public.subscription_changes (farm_id, changed_at desc, id desc);

-- Keeps only what the history is about: plan, status, price, the Custom note and team size, and the paid-until date.
create function public.subscription_tracked(p_details jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_strip_nulls(jsonb_build_object(
    'plan', p_details -> 'plan', 'status', p_details -> 'status', 'monthlyPriceKsh', p_details -> 'monthlyPriceKsh',
    'customNote', p_details -> 'customNote', 'teamLimit', p_details -> 'teamLimit', 'renewsAt', p_details -> 'renewsAt')), '{}'::jsonb);
$$;

-- Writes a history row when something tracked changed. Nothing is written for a call that changed nothing.
create function public.log_subscription_change(p_actor text, p_farm uuid, p_source text, p_before jsonb, p_after jsonb) returns void
language plpgsql as $$
declare b jsonb := public.subscription_tracked(p_before); a jsonb := public.subscription_tracked(p_after);
begin
  if b is distinct from a then
    insert into public.subscription_changes(farm_id, changed_by, source, before, after) values (p_farm, p_actor, p_source, b, a);
  end if;
end $$;

create function public.admin_subscription_history(p_actor text, p_farm uuid)
returns table(id bigint, changed_at timestamptz, changed_by_name text, source text, before jsonb, after jsonb)
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return query
    select c.id, c.changed_at, p.name, c.source, c.before, c.after
    from public.subscription_changes c left join public.profiles p on p.id = c.changed_by
    where c.farm_id = p_farm order by c.changed_at desc, c.id desc limit 200;
end $$;

-- admin_update_subscription (0009) with the history line added.
create or replace function public.admin_update_subscription(
  p_actor text, p_farm uuid, p_plan text, p_status text,
  p_price integer default null, p_note text default null, p_team_limit integer default null
) returns void language plpgsql as $$
declare current jsonb; price integer; note text; team integer; after jsonb;
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
      where farm_id = p_farm returning details into after;
  else
    update public.subscriptions
      set details = (details - 'customNote' - 'teamLimit') || jsonb_build_object(
        'plan', p_plan, 'status', p_status, 'monthlyPriceKsh', public.plan_price(p_plan))
      where farm_id = p_farm returning details into after;
  end if;
  perform public.log_subscription_change(p_actor, p_farm, 'admin', current, after);
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision)
  values (p_farm, p_actor, 'subscription.update', 'subscription', 0);
end $$;

-- A payment can now be recorded for a Custom farm (at its own agreed price), and it is logged in the history.
alter table public.subscription_payments drop constraint subscription_payments_plan_check;
alter table public.subscription_payments add constraint subscription_payments_plan_check check (plan in ('starter','farmer','farm_pro','custom'));

create or replace function public.admin_record_payment(
  p_actor text, p_farm uuid, p_amount integer, p_method text, p_reference text, p_paid_on date, p_months integer
) returns jsonb language plpgsql as $$
declare
  sub jsonb; plan text; today date := (now() at time zone 'Africa/Nairobi')::date;
  ends date; starts date; stops date; new_id uuid; after jsonb;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_method not in ('mpesa','cash','bank','other') or p_amount is null or p_amount < 1 or p_months is null
     or p_months not between 1 and 12 or p_paid_on is null or p_paid_on > today or p_paid_on < today - 366
     or length(coalesce(p_reference, '')) > 60 then
    raise exception 'Invalid payment' using errcode = '22023';
  end if;
  select details into sub from public.subscriptions where farm_id = p_farm for update;
  if not found then raise exception 'Subscription missing' using errcode = '22023'; end if;
  plan := sub->>'plan';
  if plan not in ('starter','farmer','farm_pro','custom') then raise exception 'Invalid payment' using errcode = '22023'; end if;

  ends := ((sub->>'renewsAt')::timestamptz at time zone 'Africa/Nairobi')::date;
  starts := greatest(coalesce(ends, p_paid_on), p_paid_on);
  stops := (starts + make_interval(months => p_months))::date;

  insert into public.subscription_payments(farm_id, amount_ksh, method, reference, paid_on, months, plan, period_from, period_to, recorded_by)
  values (p_farm, p_amount, p_method, btrim(coalesce(p_reference, '')), p_paid_on, p_months, plan, starts, stops, p_actor)
  returning id into new_id;

  update public.subscriptions
    set details = details || jsonb_build_object('status', 'active', 'renewsAt', stops::timestamp at time zone 'Africa/Nairobi')
    where farm_id = p_farm returning details into after;
  perform public.log_subscription_change(p_actor, p_farm, 'payment', sub, after);
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id)
  values (p_farm, p_actor, 'subscription.payment', 'subscription', 0, new_id::text);
  return jsonb_build_object('id', new_id, 'periodFrom', starts, 'periodTo', stops);
end $$;

create or replace function public.admin_void_payment(p_actor text, p_payment uuid, p_reason text) returns void
language plpgsql as $$
declare pay public.subscription_payments; sub jsonb; back timestamptz; after jsonb;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_reason)), 0) not between 3 and 200 then raise exception 'Reason required' using errcode = '22023'; end if;
  select * into pay from public.subscription_payments where id = p_payment and voided_at is null for update;
  if not found then raise exception 'Payment not found' using errcode = '22023'; end if;
  update public.subscription_payments set voided_at = now(), voided_by = p_actor, void_reason = btrim(p_reason) where id = p_payment;
  select details into sub from public.subscriptions where farm_id = pay.farm_id for update;
  if found then
    back := ((sub->>'renewsAt')::timestamptz at time zone 'Africa/Nairobi' - make_interval(months => pay.months)) at time zone 'Africa/Nairobi';
    update public.subscriptions
      set details = details || jsonb_build_object('renewsAt', back)
                           || case when back < now() and sub->>'status' = 'active' then jsonb_build_object('status', 'past_due') else '{}'::jsonb end
      where farm_id = pay.farm_id returning details into after;
    perform public.log_subscription_change(p_actor, pay.farm_id, 'payment_void', sub, after);
  end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id)
  values (pay.farm_id, p_actor, 'subscription.payment_void', 'subscription', 0, p_payment::text);
end $$;

-- ---- 2. Attempt limits on invitation codes -----------------------------------------------------------------------

create table public.code_attempts (
  id bigint generated always as identity primary key,
  -- The signed-in identity, which may not have a profile yet, so no foreign key. The address is only ever a hash.
  actor_id text not null,
  ip_hash text,
  kind text not null check (kind in ('join', 'start')),
  at timestamptz not null default now()
);
create index code_attempts_actor_idx on public.code_attempts (actor_id, at desc);
create index code_attempts_ip_idx on public.code_attempts (ip_hash, at desc) where ip_hash is not null;

-- Has this account, or this address, made too many wrong tries in the last p_minutes?
create function public.code_attempts_blocked(p_actor text, p_ip_hash text, p_account_max integer, p_ip_max integer, p_minutes integer) returns boolean
language sql stable as $$
  select (select count(*) from public.code_attempts where actor_id = p_actor and at > now() - make_interval(mins => p_minutes)) >= p_account_max
      or (p_ip_hash is not null and (select count(*) from public.code_attempts where ip_hash = p_ip_hash and at > now() - make_interval(mins => p_minutes)) >= p_ip_max);
$$;

-- Records one wrong try. Rows older than a day are removed here, so the table stays small.
create function public.record_code_attempt(p_actor text, p_ip_hash text, p_kind text) returns void
language plpgsql as $$
begin
  if p_kind not in ('join', 'start') then raise exception 'Invalid attempt' using errcode = '22023'; end if;
  insert into public.code_attempts(actor_id, ip_hash, kind) values (left(coalesce(p_actor, ''), 200), nullif(left(coalesce(p_ip_hash, ''), 64), ''), p_kind);
  delete from public.code_attempts where at < now() - interval '1 day';
end $$;
