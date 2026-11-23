-- Community, step 2 of 3: outbreak reports. Design: docs/community-groups-design.md. Builds on 0012 (groups and discussion).
--
-- A report is structured, not free text: the signs ticked from the vet guide's own list, how many animals, how long, the
-- date they were seen and whether a vet has seen them. It is shown to the group as a COUNT BY AREA, never as a farm:
--   "3 farms in Rongai report these signs this week".
-- Members of the group (owner or manager) can answer with one tap, "We see this too" or "Not here"; those are counted and
-- never named. Only a group ADMIN (a farm the SACCO trusts, see group_members.role) can see which farm reported, with the
-- person's name and phone, to follow up. Each time one does, a line is written to the audit log.
--
-- Sizes and limits (the server mirrors them in lib/community-outbreak.ts, and a test reads this file for the same numbers):
--   1 to 8 signs, 1 to 500 animals, 0 to 60 days unwell, seen in the last 14 days, 5 reports per farm per day.
--   An alert covers the last 7 days. Reports are deleted after 90 days and answers after 30 days.
--
-- Where the area comes from: the database reads it from the farm's own profile (sub-county, else county). The browser never
-- says which area a report is for, so one farm cannot report for another place.
--
-- Error codes: as in 0012, plus 22023 for refused input and MY429 for too many reports in a day.
--
-- Additive, except that four 0012 functions are replaced (create or replace) so a report never shows up as a discussion post,
-- cannot be replied to, and does not count as "last post". The previous app keeps working.

alter table public.group_posts add column area text check (area is null or length(btrim(area)) between 1 and 120);
alter table public.group_posts add column report jsonb;
-- A report has no text of its own; a discussion post still needs 1 to 600 characters.
alter table public.group_posts drop constraint group_posts_body_check;
alter table public.group_posts add constraint group_posts_body_check check (kind = 'outbreak' or length(btrim(body)) between 1 and 600);
alter table public.group_posts add constraint group_posts_report_check check ((kind = 'outbreak') = (report is not null and area is not null));
create index group_posts_outbreak_idx on public.group_posts (group_id, created_at desc) where kind = 'outbreak';

-- "Rongai", "rongai " and "RONGAI" are one area.
create function public.area_key(p_area text) returns text
language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(p_area, '')), '\s+', ' ', 'g'));
$$;

-- One answer per farm per sign per area in a group. Never shown with a name to other members.
create table public.group_alert_answers (
  group_id uuid not null references public.community_groups(id) on delete cascade,
  area_key text not null check (length(area_key) between 1 and 120),
  sign text not null check (sign ~ '^[a-z_]{2,40}$'),
  farm_id uuid not null references public.farms(id) on delete cascade,
  answer text not null check (answer in ('also', 'not_here')),
  answered_at timestamptz not null default now(),
  primary key (group_id, area_key, sign, farm_id)
);

-- ───────────── Replaced 0012 functions (reports are not discussion) ─────────────

create or replace function public.list_my_groups(p_actor text) returns jsonb
language plpgsql stable as $$
declare farm uuid; can_post boolean;
begin
  farm := public.community_farm(p_actor);
  select m.role in ('owner', 'manager') into can_post from public.farm_memberships m where m.user_id = p_actor;
  return jsonb_build_object('canPost', coalesce(can_post, false), 'groups', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', g.id, 'name', g.name, 'kind', g.kind, 'county', g.county, 'description', g.description, 'role', m.role,
             'members', (select count(*) from public.group_members x where x.group_id = g.id),
             'lastPostAt', (select max(p.created_at) from public.group_posts p where p.group_id = g.id and p.kind <> 'outbreak'))
           order by (select max(p.created_at) from public.group_posts p where p.group_id = g.id and p.kind <> 'outbreak') desc nulls last, g.name)
    from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
    where m.farm_id = farm), '[]'::jsonb));
end $$;

create or replace function public.list_group_posts(p_actor text, p_group uuid, p_before timestamptz default null, p_limit integer default 30) returns jsonb
language plpgsql stable as $$
declare farm uuid; lim integer := least(greatest(coalesce(p_limit, 30), 1), 50); can_post boolean; grp jsonb; posts jsonb; more boolean;
begin
  farm := public.community_farm(p_actor);
  select jsonb_build_object('id', g.id, 'name', g.name, 'kind', g.kind, 'county', g.county, 'description', g.description,
                            'role', m.role, 'members', (select count(*) from public.group_members x where x.group_id = g.id))
    into grp
    from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
    where m.group_id = p_group and m.farm_id = farm;
  if grp is null then raise exception 'Not a member of this group' using errcode = '42501'; end if;
  select m.role in ('owner', 'manager') into can_post from public.farm_memberships m where m.user_id = p_actor;

  select coalesce(jsonb_agg(q.item order by q.created_at desc) filter (where q.rn <= lim), '[]'::jsonb), coalesce(bool_or(q.rn > lim), false)
    into posts, more
  from (
    select s.created_at, s.item, row_number() over (order by s.created_at desc) as rn
    from (
      select p.created_at, jsonb_build_object(
        'id', p.id, 'kind', p.kind, 'body', p.body, 'createdAt', p.created_at,
        'authorName', coalesce(pr.name, 'A member'), 'farmName', coalesce(f.data ->> 'name', ''),
        'mine', p.farm_id = farm,
        'replyCount', (select count(*) from public.group_replies r where r.post_id = p.id)) as item
      from public.group_posts p
      left join public.profiles pr on pr.id = p.author_id
      left join public.farms f on f.id = p.farm_id
      where p.group_id = p_group and p.kind <> 'outbreak' and (p_before is null or p.created_at < p_before)
      order by p.created_at desc limit lim + 1) s) q;

  return jsonb_build_object('group', grp, 'canPost', coalesce(can_post, false), 'posts', posts, 'more', more);
end $$;

create or replace function public.get_group_post(p_actor text, p_post uuid) returns jsonb
language plpgsql stable as $$
declare farm uuid; post public.group_posts%rowtype; can_post boolean; item jsonb;
begin
  farm := public.community_farm(p_actor);
  select * into post from public.group_posts where id = p_post and kind <> 'outbreak';
  if not found or not exists (select 1 from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
                              where m.group_id = post.group_id and m.farm_id = farm) then
    raise exception 'Not a member of this group' using errcode = '42501';
  end if;
  select m.role in ('owner', 'manager') into can_post from public.farm_memberships m where m.user_id = p_actor;
  select jsonb_build_object(
    'id', post.id, 'groupId', post.group_id, 'kind', post.kind, 'body', post.body, 'createdAt', post.created_at,
    'authorName', coalesce(pr.name, 'A member'), 'farmName', coalesce(f.data ->> 'name', ''), 'mine', post.farm_id = farm)
    into item
    from (select 1) one
    left join public.profiles pr on pr.id = post.author_id
    left join public.farms f on f.id = post.farm_id;
  return jsonb_build_object('post', item, 'canPost', coalesce(can_post, false), 'replies', coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'body', r.body, 'createdAt', r.created_at,
                                        'authorName', coalesce(rp.name, 'A member'), 'farmName', coalesce(rf.data ->> 'name', ''),
                                        'mine', r.farm_id = farm) order by r.created_at)
    from public.group_replies r
    left join public.profiles rp on rp.id = r.author_id
    left join public.farms rf on rf.id = r.farm_id
    where r.post_id = post.id), '[]'::jsonb));
end $$;

create or replace function public.create_group_reply(p_actor text, p_post uuid, p_body text) returns uuid
language plpgsql as $$
declare farm uuid; post public.group_posts%rowtype; created uuid;
begin
  farm := public.community_farm(p_actor, true);
  select * into post from public.group_posts where id = p_post and kind <> 'outbreak';
  if not found or not exists (select 1 from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
                              where m.group_id = post.group_id and m.farm_id = farm) then
    raise exception 'Not a member of this group' using errcode = '42501';
  end if;
  if coalesce(length(btrim(p_body)), 0) not between 1 and 400 then raise exception 'A reply needs 1 to 400 characters' using errcode = '22023'; end if;
  -- Thirty replies an hour per farm.
  if (select count(*) from public.group_replies where farm_id = farm and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many replies' using errcode = 'MY429';
  end if;
  insert into public.group_replies(post_id, farm_id, author_id, body) values (p_post, farm, p_actor, btrim(p_body)) returning id into created;
  return created;
end $$;

-- ───────────── Making a report (owner and manager of a member farm) ─────────────

-- The sign ids are checked against the vet guide's list by the server (the list lives in the app); the database checks their
-- shape, so a direct call cannot store anything but short lower-case ids. p_seen_on is a Nairobi date.
create function public.create_outbreak_report(p_actor text, p_group uuid, p_signs text[], p_animals integer, p_days integer, p_seen_on date, p_vet_seen text) returns uuid
language plpgsql as $$
declare farm uuid; place text; county text; today date := (now() at time zone 'Africa/Nairobi')::date; created uuid;
begin
  farm := public.community_farm(p_actor, true);
  if not exists (select 1 from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
                 where m.group_id = p_group and m.farm_id = farm) then
    raise exception 'Not a member of this group' using errcode = '42501';
  end if;
  if p_signs is null or cardinality(p_signs) not between 1 and 8
     or exists (select 1 from unnest(p_signs) s where s is null or s !~ '^[a-z_]{2,40}$')
     or (select count(distinct s) from unnest(p_signs) s) <> cardinality(p_signs)
     or p_animals is null or p_animals not between 1 and 500
     or p_days is null or p_days not between 0 and 60
     or p_seen_on is null or p_seen_on > today or p_seen_on < today - 14
     or p_vet_seen not in ('yes', 'called', 'no') then
    raise exception 'Invalid report' using errcode = '22023';
  end if;
  -- Five reports a day per farm.
  if (select count(*) from public.group_posts where farm_id = farm and kind = 'outbreak' and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Too many reports' using errcode = 'MY429';
  end if;
  select coalesce(nullif(btrim(f.data ->> 'subCounty'), ''), nullif(btrim(f.data ->> 'county'), '')), nullif(btrim(f.data ->> 'county'), '')
    into place, county from public.farms f where f.id = farm;
  if place is null then raise exception 'The farm has no place set' using errcode = '22023'; end if;

  insert into public.group_posts(group_id, farm_id, author_id, kind, body, area, report)
  values (p_group, farm, p_actor, 'outbreak', '', left(place, 120),
          jsonb_build_object('signs', to_jsonb(p_signs), 'animals', p_animals, 'days', p_days, 'seenOn', p_seen_on, 'vetSeen', p_vet_seen, 'county', left(coalesce(county, place), 120)))
  returning id into created;

  -- Old reports and answers are not kept: reports 90 days, answers 30 days.
  delete from public.group_posts where kind = 'outbreak' and created_at < now() - interval '90 days';
  delete from public.group_alert_answers where answered_at < now() - interval '30 days';
  return created;
end $$;

-- ───────────── Counts by area ─────────────

-- The alerts of one group over the last 7 days: for each area and sign, how many FARMS reported it and how many farms
-- answered "we see this too" or "not here". No farm is named. p_farm is the viewing farm (for "mine" and "my answer").
create function public.group_alert_clusters(p_group uuid, p_farm uuid) returns jsonb
language sql stable as $$
  with r as (
    select p.farm_id, public.area_key(p.area) as k, p.area, p.report ->> 'county' as county, s.sign, p.created_at
    from public.group_posts p, jsonb_array_elements_text(p.report -> 'signs') as s(sign)
    where p.group_id = p_group and p.kind = 'outbreak' and p.created_at > now() - interval '7 days'
  ), c as (
    select k, sign, max(area) as area, max(county) as county, count(distinct farm_id) as farms, max(created_at) as latest, bool_or(farm_id = p_farm) as mine
    from r group by k, sign
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'area', c.area, 'areaKey', c.k, 'county', c.county, 'sign', c.sign, 'farms', c.farms, 'latestAt', c.latest, 'iReported', c.mine,
    'also', (select count(*) from public.group_alert_answers a
              where a.group_id = p_group and a.area_key = c.k and a.sign = c.sign and a.answer = 'also' and a.answered_at > now() - interval '7 days'
                and a.farm_id not in (select r2.farm_id from r r2 where r2.k = c.k and r2.sign = c.sign)),
    'notHere', (select count(*) from public.group_alert_answers a
              where a.group_id = p_group and a.area_key = c.k and a.sign = c.sign and a.answer = 'not_here' and a.answered_at > now() - interval '7 days'
                and a.farm_id not in (select r2.farm_id from r r2 where r2.k = c.k and r2.sign = c.sign)),
    'myAnswer', (select a.answer from public.group_alert_answers a
                  where a.group_id = p_group and a.area_key = c.k and a.sign = c.sign and a.farm_id = p_farm and a.answered_at > now() - interval '7 days')
  ) order by c.farms desc, c.latest desc), '[]'::jsonb)
  from c;
$$;

-- What a member sees in a group: the counts, whether they may answer, and their own farm's open reports (to withdraw).
create function public.list_group_alerts(p_actor text, p_group uuid) returns jsonb
language plpgsql stable as $$
declare farm uuid; can_post boolean;
begin
  farm := public.community_farm(p_actor);
  if not exists (select 1 from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
                 where m.group_id = p_group and m.farm_id = farm) then
    raise exception 'Not a member of this group' using errcode = '42501';
  end if;
  select m.role in ('owner', 'manager') into can_post from public.farm_memberships m where m.user_id = p_actor;
  return jsonb_build_object(
    'canAnswer', coalesce(can_post, false),
    'clusters', public.group_alert_clusters(p_group, farm),
    'mine', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'createdAt', p.created_at, 'signs', p.report -> 'signs', 'animals', p.report -> 'animals') order by p.created_at desc)
      from public.group_posts p
      where p.group_id = p_group and p.kind = 'outbreak' and p.farm_id = farm and p.created_at > now() - interval '7 days'), '[]'::jsonb));
end $$;

-- For the Home screen: the open alerts, across all of a farm's groups, in the farm's own county, that it did not report itself.
create function public.my_group_alerts(p_actor text) returns jsonb
language plpgsql stable as $$
declare farm uuid; my_county text;
begin
  farm := public.community_farm(p_actor);
  select lower(btrim(f.data ->> 'county')) into my_county from public.farms f where f.id = farm;
  return coalesce((
    select jsonb_agg(x.item order by (x.item ->> 'farms')::int desc, x.item ->> 'latestAt' desc)
    from (
      select jsonb_build_object('groupId', g.id, 'groupName', g.name, 'area', c ->> 'area', 'sign', c ->> 'sign', 'farms', (c ->> 'farms')::int, 'latestAt', c ->> 'latestAt') as item
      from public.group_members m
      join public.community_groups g on g.id = m.group_id and g.archived_at is null,
      jsonb_array_elements(public.group_alert_clusters(g.id, farm)) c
      where m.farm_id = farm and lower(btrim(c ->> 'county')) = my_county and (c ->> 'iReported')::boolean = false) x), '[]'::jsonb);
end $$;

-- "We see this too" or "Not here" (or null to take the answer back) for one open alert. Not for a farm that reported it.
create function public.answer_group_alert(p_actor text, p_group uuid, p_area_key text, p_sign text, p_answer text) returns void
language plpgsql as $$
declare farm uuid; open_alert jsonb;
begin
  farm := public.community_farm(p_actor, true);
  if not exists (select 1 from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
                 where m.group_id = p_group and m.farm_id = farm) then
    raise exception 'Not a member of this group' using errcode = '42501';
  end if;
  if p_answer is not null and p_answer not in ('also', 'not_here') then raise exception 'Invalid answer' using errcode = '22023'; end if;
  select c into open_alert from jsonb_array_elements(public.group_alert_clusters(p_group, farm)) c
    where c ->> 'areaKey' = public.area_key(p_area_key) and c ->> 'sign' = p_sign;
  if open_alert is null or (open_alert ->> 'iReported')::boolean then raise exception 'No open alert to answer' using errcode = '22023'; end if;
  if p_answer is null then
    delete from public.group_alert_answers where group_id = p_group and area_key = public.area_key(p_area_key) and sign = p_sign and farm_id = farm;
  else
    insert into public.group_alert_answers(group_id, area_key, sign, farm_id, answer)
    values (p_group, public.area_key(p_area_key), p_sign, farm, p_answer)
    on conflict (group_id, area_key, sign, farm_id) do update set answer = excluded.answer, answered_at = now();
  end if;
end $$;

-- ───────────── Follow-up (group admin only) ─────────────

-- Which farm made each report in the last 30 days, with the person's name and phone, so the group's admin can follow up.
-- Only an owner or manager of a farm that is an ADMIN of this group. Each look is written to the audit log.
create function public.list_group_reports_for_admin(p_actor text, p_group uuid) returns jsonb
language plpgsql as $$
declare farm uuid;
begin
  farm := public.community_farm(p_actor, true);
  if not exists (select 1 from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
                 where m.group_id = p_group and m.farm_id = farm and m.role = 'admin') then
    raise exception 'Only a group admin can do this' using errcode = '42501';
  end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (farm, p_actor, 'community.reporters.view', 'community', 0, p_group::text);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'createdAt', p.created_at, 'area', p.area, 'farmName', coalesce(f.data ->> 'name', ''), 'personName', coalesce(pr.name, ''), 'phone', coalesce(pr.phone, ''),
      'signs', p.report -> 'signs', 'animals', p.report -> 'animals', 'days', p.report -> 'days', 'seenOn', p.report -> 'seenOn', 'vetSeen', p.report ->> 'vetSeen')
      order by p.created_at desc)
    from public.group_posts p
    left join public.farms f on f.id = p.farm_id
    left join public.profiles pr on pr.id = p.author_id
    where p.group_id = p_group and p.kind = 'outbreak' and p.created_at > now() - interval '30 days'), '[]'::jsonb);
end $$;
