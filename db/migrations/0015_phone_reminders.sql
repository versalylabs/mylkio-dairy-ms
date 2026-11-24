-- Phone reminders: one morning summary, as a phone notification, of the reminders due today or overdue.
--
-- A person turns it on per phone in Settings. The phone gives the server a "push subscription" (an address at the phone
-- maker's push service plus two keys), stored here against that person. Once a day a scheduled job (Vercel Cron, see
-- app/api/cron/reminders) asks push_digest_due() for every phone that has not been sent today's summary, with that farm's
-- open reminders, sends them, and marks them sent. Every plan has this (lib/plans.ts, reminderPush).
--
-- What is sent: the farm's reminders that are not done, not deleted, and due today or earlier (a withdrawal reminder whose
-- date has passed is over, as on Home). A worker is not sent payment or co-op statement reminders (they never see money).
-- Nothing is sent when there is nothing due. Up to 5 phones per person.
-- Additive: new table and functions only.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 10 and 100),
  created_at timestamptz not null default now(),
  last_sent_day date
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Saves this phone for the caller (a person on a farm). The same phone saved again just moves to the caller.
create function public.save_push_subscription(p_actor text, p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql as $$
begin
  if not exists (select 1 from public.farm_memberships where user_id = p_actor and role in ('owner', 'manager', 'worker')) then
    raise exception 'A farm account is required' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 20 and 200 or coalesce(length(p_auth), 0) not between 10 and 100 then
    raise exception 'Invalid subscription' using errcode = '22023';
  end if;
  insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values (p_actor, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
  -- Five phones per person: the oldest goes.
  delete from public.push_subscriptions where id in (
    select id from public.push_subscriptions where user_id = p_actor order by created_at desc offset 5);
end $$;

create function public.remove_push_subscription(p_actor text, p_endpoint text) returns void
language sql as $$
  delete from public.push_subscriptions where user_id = p_actor and endpoint = p_endpoint;
$$;

-- For the daily job: every phone not yet sent the summary for p_day (a Nairobi date) whose farm has something due,
-- with the reminders and the farm's language. Called by the server only, never with a user's id.
create function public.push_digest_due(p_day date) returns table(
  subscription_id uuid, endpoint text, p256dh text, auth text, language text, reminders jsonb
) language sql stable as $$
  select s.id, s.endpoint, s.p256dh, s.auth, coalesce(f.data ->> 'preferredLanguage', 'en'), r.items
  from public.push_subscriptions s
  join public.farm_memberships m on m.user_id = s.user_id and m.role in ('owner', 'manager', 'worker')
  join public.farms f on f.id = m.farm_id
  cross join lateral (
    select jsonb_agg(jsonb_build_object('title', x.data ->> 'title', 'type', x.data ->> 'type', 'dueDate', x.data ->> 'dueDate')
                     order by x.data ->> 'dueDate', x.data ->> 'title') as items
    from public.farm_records x
    where x.farm_id = m.farm_id and x.bucket = 'reminders' and not x.deleted
      and coalesce((x.data ->> 'completed')::boolean, false) = false
      and (x.data ->> 'dueDate') <= p_day::text
      and not (x.data ->> 'type' = 'withdrawal' and (x.data ->> 'dueDate') < p_day::text)
      and not (m.role = 'worker' and x.data ->> 'type' in ('payment_due', 'coop_statement'))
  ) r
  where s.last_sent_day is distinct from p_day and r.items is not null;
$$;

create function public.mark_push_sent(p_ids uuid[], p_day date) returns void
language sql as $$
  update public.push_subscriptions set last_sent_day = p_day where id = any(p_ids);
$$;

-- A phone the push service says no longer exists (it was reset, or notifications were turned off) is forgotten.
create function public.drop_push_subscriptions(p_ids uuid[]) returns void
language sql as $$
  delete from public.push_subscriptions where id = any(p_ids);
$$;

-- How many phones the caller has turned on (for Settings).
create function public.my_push_count(p_actor text) returns integer
language sql stable as $$
  select count(*)::int from public.push_subscriptions where user_id = p_actor;
$$;
