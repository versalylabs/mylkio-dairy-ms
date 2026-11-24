-- Community alerts as phone notifications, using the phones people turned on for reminders (0015).
--
--   * An OFFICIAL ALERT notifies, at once, every person whose farm is in a (not archived) group of that county.
--   * An OUTBREAK REPORT notifies the people of the group's other farms in the same county as the report, but only for a
--     sign that is NEW in that area this week (no other report of it there in the last 7 days). Later reports of the
--     same thing only change the count; they do not ring every phone again.
--
-- The reporting farm is never notified of its own report. Workers are included (alerts hold no money). The server sends
-- right after the request (Next.js after()); these functions only choose the phones. Additive: functions only.

create function public.push_targets_for_official(p_alert uuid)
returns table(subscription_id uuid, endpoint text, p256dh text, auth text, language text)
language sql stable as $$
  select distinct on (s.id) s.id, s.endpoint, s.p256dh, s.auth, coalesce(f.data ->> 'preferredLanguage', 'en')
  from public.official_alerts a
  join public.community_groups g on g.archived_at is null and lower(btrim(g.county)) = lower(btrim(a.county))
  join public.group_members gm on gm.group_id = g.id
  join public.farm_memberships m on m.farm_id = gm.farm_id and m.role in ('owner', 'manager', 'worker')
  join public.push_subscriptions s on s.user_id = m.user_id
  join public.farms f on f.id = m.farm_id
  where a.id = p_alert and a.withdrawn_at is null and a.expires_at > now();
$$;

-- The signs of this report that no other report in the same group and area mentioned in the 7 days before it.
create function public.new_outbreak_signs(p_post uuid) returns text[]
language sql stable as $$
  select coalesce(array_agg(s.sign order by s.sign), '{}')
  from public.group_posts p, jsonb_array_elements_text(p.report -> 'signs') as s(sign)
  where p.id = p_post and p.kind = 'outbreak'
    and not exists (
      select 1 from public.group_posts o
      where o.group_id = p.group_id and o.kind = 'outbreak' and o.id <> p.id
        and public.area_key(o.area) = public.area_key(p.area)
        and o.created_at > p.created_at - interval '7 days' and o.created_at <= p.created_at
        and o.report -> 'signs' ? s.sign);
$$;

create function public.push_targets_for_outbreak(p_post uuid)
returns table(subscription_id uuid, endpoint text, p256dh text, auth text, language text, area text, group_name text, signs text[])
language sql stable as $$
  select distinct on (s.id) s.id, s.endpoint, s.p256dh, s.auth, coalesce(f.data ->> 'preferredLanguage', 'en'), p.area, g.name, n.signs
  from public.group_posts p
  cross join lateral (select public.new_outbreak_signs(p.id) as signs) n
  join public.community_groups g on g.id = p.group_id and g.archived_at is null
  join public.group_members gm on gm.group_id = g.id and gm.farm_id <> p.farm_id
  join public.farms f on f.id = gm.farm_id and lower(btrim(f.data ->> 'county')) = lower(btrim(p.report ->> 'county'))
  join public.farm_memberships m on m.farm_id = gm.farm_id and m.role in ('owner', 'manager', 'worker')
  join public.push_subscriptions s on s.user_id = m.user_id
  where p.id = p_post and p.kind = 'outbreak' and cardinality(n.signs) > 0;
$$;
