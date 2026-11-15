-- Commercial administration: a manual payment ledger, account notes and herd size for the platform administrator.
--
-- Mylkio does not take payments automatically (decided: no M-Pesa billing yet). A platform administrator
-- records each payment they receive (M-Pesa, cash or bank), and that extends the account's paid-until date
-- (`renewsAt` in the subscription). Everything here is administrator-only: each function re-checks
-- `is_platform_admin(p_actor)`, like the rest of the backend.
--
-- What it never does: it never shows the content of a farm's records. `herd_size` is only a count of live cows,
-- nothing else, so the administrator can see whether a farm still fits its plan.

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  amount_ksh integer not null check (amount_ksh between 1 and 1000000),
  method text not null check (method in ('mpesa','cash','bank','other')),
  reference text not null default '' check (length(reference) <= 60),
  paid_on date not null,
  months integer not null check (months between 1 and 12),
  plan text not null check (plan in ('starter','farmer','farm_pro')),
  period_from date not null,
  period_to date not null,
  recorded_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by text references public.profiles(id) on delete set null,
  void_reason text check (void_reason is null or length(void_reason) <= 200),
  check ((voided_at is null) = (void_reason is null))
);
create index subscription_payments_farm_idx on public.subscription_payments (farm_id, paid_on desc);
create index subscription_payments_paid_idx on public.subscription_payments (paid_on) where voided_at is null;
-- The same M-Pesa or bank reference cannot be entered twice (a voided entry frees it again).
create unique index subscription_payments_reference_uniq
  on public.subscription_payments (lower(btrim(reference)))
  where voided_at is null and btrim(reference) <> '' and method in ('mpesa','bank');

create table public.account_notes (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  author text references public.profiles(id) on delete set null,
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index account_notes_farm_idx on public.account_notes (farm_id, created_at desc);

-- Records a payment and moves the paid-until date forward by the months paid for. A farm that is still
-- paid up (or on trial) keeps its remaining time: the new period starts when the old one ends. A farm that
-- has lapsed starts again from the day it paid.
create function public.admin_record_payment(
  p_actor text, p_farm uuid, p_amount integer, p_method text, p_reference text, p_paid_on date, p_months integer
) returns jsonb language plpgsql as $$
declare
  sub jsonb; plan text; today date := (now() at time zone 'Africa/Nairobi')::date;
  ends date; starts date; stops date; new_id uuid;
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
  if plan not in ('starter','farmer','farm_pro') then raise exception 'Invalid payment' using errcode = '22023'; end if;

  ends := ((sub->>'renewsAt')::timestamptz at time zone 'Africa/Nairobi')::date;
  starts := greatest(coalesce(ends, p_paid_on), p_paid_on);
  stops := (starts + make_interval(months => p_months))::date;

  insert into public.subscription_payments(farm_id, amount_ksh, method, reference, paid_on, months, plan, period_from, period_to, recorded_by)
  values (p_farm, p_amount, p_method, btrim(coalesce(p_reference, '')), p_paid_on, p_months, plan, starts, stops, p_actor)
  returning id into new_id;

  update public.subscriptions
    set details = details || jsonb_build_object('status', 'active', 'renewsAt', stops::timestamp at time zone 'Africa/Nairobi')
    where farm_id = p_farm;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id)
  values (p_farm, p_actor, 'subscription.payment', 'subscription', 0, new_id::text);
  return jsonb_build_object('id', new_id, 'periodFrom', starts, 'periodTo', stops);
end $$;

-- Cancels a payment that was entered wrongly. It stays in the list, marked void with the reason, and the
-- paid-until date moves back by the months it had added. An account that is then past its date becomes
-- "past due" so it shows up for follow-up; the administrator can still set any status by hand.
create function public.admin_void_payment(p_actor text, p_payment uuid, p_reason text) returns void
language plpgsql as $$
declare pay public.subscription_payments; sub jsonb; back timestamptz;
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
      where farm_id = pay.farm_id;
  end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id)
  values (pay.farm_id, p_actor, 'subscription.payment_void', 'subscription', 0, p_payment::text);
end $$;

create function public.admin_list_payments(p_actor text, p_farm uuid)
returns table(id uuid, amount_ksh integer, method text, reference text, paid_on date, months integer, plan text,
              period_from date, period_to date, recorded_by_name text, created_at timestamptz,
              voided_at timestamptz, void_reason text)
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return query
    select s.id, s.amount_ksh, s.method, s.reference, s.paid_on, s.months, s.plan, s.period_from, s.period_to,
           p.name, s.created_at, s.voided_at, s.void_reason
    from public.subscription_payments s
    left join public.profiles p on p.id = s.recorded_by
    where s.farm_id = p_farm
    order by s.paid_on desc, s.created_at desc limit 200;
end $$;

create function public.admin_add_note(p_actor text, p_farm uuid, p_body text) returns uuid
language plpgsql as $$
declare new_id uuid;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_body)), 0) not between 1 and 500 or not exists (select 1 from public.farms where id = p_farm) then
    raise exception 'Invalid note' using errcode = '22023';
  end if;
  insert into public.account_notes(farm_id, author, body) values (p_farm, p_actor, btrim(p_body)) returning id into new_id;
  return new_id;
end $$;

create function public.admin_list_notes(p_actor text, p_farm uuid)
returns table(id uuid, body text, author_name text, created_at timestamptz)
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return query
    select n.id, n.body, p.name, n.created_at
    from public.account_notes n left join public.profiles p on p.id = n.author
    where n.farm_id = p_farm order by n.created_at desc limit 100;
end $$;

-- Money received per month for the last six months (Nairobi months), voided payments left out.
create function public.admin_collections(p_actor text) returns jsonb
language plpgsql stable as $$
declare this_month date := date_trunc('month', (now() at time zone 'Africa/Nairobi'))::date;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return jsonb_build_object('months', coalesce((
    select jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'amountKsh', coalesce(t.amount, 0), 'payments', coalesce(t.n, 0)) order by m)
    from generate_series(this_month - interval '5 months', this_month, interval '1 month') as m
    left join (
      select date_trunc('month', paid_on::timestamp)::date as month, sum(amount_ksh)::bigint as amount, count(*)::int as n
      from public.subscription_payments where voided_at is null group by 1
    ) t on t.month = m::date
  ), '[]'::jsonb));
end $$;

-- The account list gains the herd size (a count only), the last payment date and the number of notes.
drop function public.admin_list_accounts(text);
create function public.admin_list_accounts(p_actor text)
returns table(id text, email text, name text, phone text, role text, farm_id uuid, farm_name text, county text,
              subscription jsonb, created_at timestamptz, last_seen_at timestamptz,
              herd_size integer, last_paid_on text, note_count integer)
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return query
    select p.id, p.email, p.name, p.phone, p.role, m.farm_id, f.data->>'name', f.data->>'county',
           s.details, p.created_at, p.last_seen_at,
           (select count(*)::int from public.farm_records r
             where r.farm_id = m.farm_id and r.bucket = 'cows' and not r.deleted
               and coalesce(r.data->>'status', '') not in ('sold','deceased','archived')),
           (select max(x.paid_on)::text from public.subscription_payments x where x.farm_id = m.farm_id and x.voided_at is null),
           (select count(*)::int from public.account_notes n where n.farm_id = m.farm_id)
    from public.profiles p
    left join public.farm_memberships m on m.user_id = p.id
    left join public.farms f on f.id = m.farm_id
    left join public.subscriptions s on s.farm_id = m.farm_id
    order by p.created_at desc limit 500;
end $$;
