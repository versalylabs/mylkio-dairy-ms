-- Community, step 3 of 3: moderation, official alerts and unread counts. Design: docs/community-groups-design.md.
--
--   * Anyone in a group (owner, manager or worker) can report a post or reply to Mylkio staff, with a reason. Staff see
--     the reported text, who wrote it and the group, in a review queue, and either remove it or keep it. Staff still do
--     not read groups otherwise.
--   * A group's admin (owner or manager of a farm with role 'admin' in group_members) can remove any discussion post or
--     reply in that group, and take a member farm out of it (not themselves, not another admin). Each is audited.
--   * Mylkio staff can post an OFFICIAL ALERT to every group in a county, always with its source and date. It is pinned
--     above the group's outbreak alerts and discussion, and shown on Home, until it expires or staff withdraw it. A group
--     created later in that county sees it too.
--   * Unread counts: per person, the discussion posts from other farms and official alerts since they last opened the group.
--
-- Limits: 20 reports of posts per farm per day; an official alert has a title of 3 to 120 characters, a text of 1 to 1000,
-- a source name, an optional https link, a source date in the last year, and is shown for 1 to 90 days.
--
-- Error codes as before: 42501 no access, 22023 refused input, MY403 plan, MY429 too many.
-- Additive, except list_my_groups and list_group_alerts (0013) are replaced to add the unread count and official alerts.

-- ───────────── Reporting a post to staff ─────────────

create table public.group_flags (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  post_id uuid references public.group_posts(id) on delete cascade,
  reply_id uuid references public.group_replies(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  flagged_by text references public.profiles(id) on delete set null,
  reason text not null check (reason in ('rumour', 'abuse', 'private', 'spam', 'other')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text references public.profiles(id) on delete set null,
  check ((post_id is null) <> (reply_id is null))
);
-- One report per farm per post or reply.
create unique index group_flags_post_once on public.group_flags (post_id, farm_id) where post_id is not null;
create unique index group_flags_reply_once on public.group_flags (reply_id, farm_id) where reply_id is not null;
create index group_flags_open_idx on public.group_flags (created_at) where resolved_at is null;

-- The group a discussion post or reply belongs to (null for anything else: an outbreak report, or nothing).
create function public.discussion_item_group(p_post uuid, p_reply uuid) returns uuid
language sql stable as $$
  select case
    when p_post is not null then (select p.group_id from public.group_posts p where p.id = p_post and p.kind = 'discussion')
    else (select p.group_id from public.group_replies r join public.group_posts p on p.id = r.post_id where r.id = p_reply and p.kind = 'discussion')
  end;
$$;

create function public.flag_group_item(p_actor text, p_post uuid, p_reply uuid, p_reason text) returns void
language plpgsql as $$
declare farm uuid; grp uuid; author_farm uuid;
begin
  farm := public.community_farm(p_actor);
  if (p_post is null) = (p_reply is null) or p_reason not in ('rumour', 'abuse', 'private', 'spam', 'other') then
    raise exception 'Invalid report' using errcode = '22023';
  end if;
  grp := public.discussion_item_group(p_post, p_reply);
  if grp is null or not exists (select 1 from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
                                where m.group_id = grp and m.farm_id = farm) then
    raise exception 'Not a member of this group' using errcode = '42501';
  end if;
  author_farm := coalesce((select farm_id from public.group_posts where id = p_post), (select farm_id from public.group_replies where id = p_reply));
  if author_farm = farm then raise exception 'You cannot report your own post' using errcode = '22023'; end if;
  -- Twenty reports a day per farm.
  if (select count(*) from public.group_flags where farm_id = farm and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'Too many reports' using errcode = 'MY429';
  end if;
  insert into public.group_flags(group_id, post_id, reply_id, farm_id, flagged_by, reason)
  values (grp, p_post, p_reply, farm, p_actor, p_reason)
  on conflict do nothing;
end $$;

-- ───────────── The group admin's tools ─────────────

-- The farm of a caller who may act as this group's admin (owner or manager of an admin farm), or an error.
create function public.group_admin_farm(p_actor text, p_group uuid) returns uuid
language plpgsql stable as $$
declare farm uuid;
begin
  farm := public.community_farm(p_actor, true);
  if not exists (select 1 from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
                 where m.group_id = p_group and m.farm_id = farm and m.role = 'admin') then
    raise exception 'Only a group admin can do this' using errcode = '42501';
  end if;
  return farm;
end $$;

-- Removes a discussion post (with its replies) or a reply in the group. Its open reports go with it.
create function public.moderate_remove_item(p_actor text, p_group uuid, p_post uuid, p_reply uuid) returns void
language plpgsql as $$
declare farm uuid;
begin
  farm := public.group_admin_farm(p_actor, p_group);
  if (p_post is null) = (p_reply is null) or public.discussion_item_group(p_post, p_reply) is distinct from p_group then
    raise exception 'Not found in this group' using errcode = '22023';
  end if;
  if p_post is not null then delete from public.group_posts where id = p_post; else delete from public.group_replies where id = p_reply; end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id)
  values (farm, p_actor, 'community.moderate.remove', 'community', 0, coalesce(p_post, p_reply)::text);
end $$;

-- The farms in the group, for its admin: names and places only.
create function public.list_group_members_for_admin(p_actor text, p_group uuid) returns jsonb
language plpgsql stable as $$
begin
  perform public.group_admin_farm(p_actor, p_group);
  return coalesce((
    select jsonb_agg(jsonb_build_object('farmId', m.farm_id, 'farmName', coalesce(f.data ->> 'name', ''),
                                        'area', coalesce(nullif(f.data ->> 'subCounty', ''), f.data ->> 'county', ''),
                                        'role', m.role, 'joinedAt', m.joined_at) order by (m.role = 'admin') desc, m.joined_at)
    from public.group_members m join public.farms f on f.id = m.farm_id
    where m.group_id = p_group), '[]'::jsonb);
end $$;

-- Takes a member farm out of the group. Not the admin's own farm and not another admin (staff do that).
create function public.moderate_remove_member(p_actor text, p_group uuid, p_farm uuid) returns void
language plpgsql as $$
declare farm uuid;
begin
  farm := public.group_admin_farm(p_actor, p_group);
  delete from public.group_members where group_id = p_group and farm_id = p_farm and role = 'member' and farm_id <> farm;
  if not found then raise exception 'Member not found' using errcode = '22023'; end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id)
  values (farm, p_actor, 'community.moderate.remove_member', 'community', 0, p_farm::text);
end $$;

-- ───────────── Staff: the review queue ─────────────

-- Reported posts and replies that are still open, one row per item, with the text, who wrote it and why it was reported.
create function public.admin_list_flags(p_actor text) returns jsonb
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(x.item order by x.first_at)
    from (
      select min(fl.created_at) as first_at, jsonb_build_object(
        'postId', fl.post_id, 'replyId', fl.reply_id, 'groupName', g.name, 'county', g.county,
        'body', coalesce(p.body, r.body), 'writtenAt', coalesce(p.created_at, r.created_at),
        'authorName', coalesce(pr.name, ''), 'farmName', coalesce(f.data ->> 'name', ''),
        'reports', count(*), 'reasons', jsonb_agg(distinct fl.reason), 'firstReportedAt', min(fl.created_at)) as item
      from public.group_flags fl
      join public.community_groups g on g.id = fl.group_id
      left join public.group_posts p on p.id = fl.post_id
      left join public.group_replies r on r.id = fl.reply_id
      left join public.profiles pr on pr.id = coalesce(p.author_id, r.author_id)
      left join public.farms f on f.id = coalesce(p.farm_id, r.farm_id)
      where fl.resolved_at is null
      group by fl.post_id, fl.reply_id, g.name, g.county, p.body, r.body, p.created_at, r.created_at, pr.name, f.data) x), '[]'::jsonb);
end $$;

-- Staff decide: 'remove' deletes the post or reply (its reports go with it), 'keep' closes its reports.
create function public.admin_resolve_flags(p_actor text, p_post uuid, p_reply uuid, p_action text) returns void
language plpgsql as $$
declare author_farm uuid;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if (p_post is null) = (p_reply is null) or p_action not in ('remove', 'keep')
     or not exists (select 1 from public.group_flags where (post_id = p_post or reply_id = p_reply) and resolved_at is null) then
    raise exception 'Nothing to resolve' using errcode = '22023';
  end if;
  author_farm := coalesce((select farm_id from public.group_posts where id = p_post), (select farm_id from public.group_replies where id = p_reply));
  if p_action = 'remove' then
    if p_post is not null then delete from public.group_posts where id = p_post; else delete from public.group_replies where id = p_reply; end if;
  else
    update public.group_flags set resolved_at = now(), resolved_by = p_actor where (post_id = p_post or reply_id = p_reply) and resolved_at is null;
  end if;
  if author_farm is not null then
    insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id)
    values (author_farm, p_actor, 'community.flags.' || p_action, 'community', 0, coalesce(p_post, p_reply)::text);
  end if;
end $$;

-- ───────────── Official alerts ─────────────

create table public.official_alerts (
  id uuid primary key default gen_random_uuid(),
  county text not null check (length(btrim(county)) between 2 and 80),
  title text not null check (length(btrim(title)) between 3 and 120),
  body text not null check (length(btrim(body)) between 1 and 1000),
  source_name text not null check (length(btrim(source_name)) between 2 and 160),
  source_url text check (source_url is null or (source_url ~ '^https://' and length(source_url) <= 500)),
  source_date date not null,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  withdrawn_at timestamptz
);
create index official_alerts_county_idx on public.official_alerts (lower(btrim(county)), expires_at);

-- The alerts showing in a county now, newest first.
create function public.official_alerts_for(p_county text) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body, 'sourceName', a.source_name,
                                               'sourceUrl', a.source_url, 'sourceDate', a.source_date, 'createdAt', a.created_at,
                                               'county', a.county) order by a.created_at desc), '[]'::jsonb)
  from public.official_alerts a
  where lower(btrim(a.county)) = lower(btrim(coalesce(p_county, ''))) and a.withdrawn_at is null and a.expires_at > now();
$$;

create function public.admin_create_official_alert(
  p_actor text, p_county text, p_title text, p_body text, p_source_name text, p_source_url text, p_source_date date, p_days integer
) returns uuid language plpgsql as $$
declare created uuid; today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_county)), 0) not between 2 and 80 or coalesce(length(btrim(p_title)), 0) not between 3 and 120
     or coalesce(length(btrim(p_body)), 0) not between 1 and 1000 or coalesce(length(btrim(p_source_name)), 0) not between 2 and 160
     or (nullif(btrim(coalesce(p_source_url, '')), '') is not null and (btrim(p_source_url) !~ '^https://' or length(btrim(p_source_url)) > 500))
     or p_source_date is null or p_source_date > today or p_source_date < today - 365
     or p_days is null or p_days not between 1 and 90 then
    raise exception 'Invalid alert' using errcode = '22023';
  end if;
  insert into public.official_alerts(county, title, body, source_name, source_url, source_date, created_by, expires_at)
  values (btrim(p_county), btrim(p_title), btrim(p_body), btrim(p_source_name), nullif(btrim(coalesce(p_source_url, '')), ''), p_source_date, p_actor,
          now() + make_interval(days => p_days))
  returning id into created;
  return created;
end $$;

-- Every alert, with how many groups it reaches now.
create function public.admin_list_official_alerts(p_actor text) returns jsonb
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id, 'county', a.county, 'title', a.title, 'body', a.body, 'sourceName', a.source_name,
                                        'sourceUrl', a.source_url, 'sourceDate', a.source_date, 'createdAt', a.created_at, 'expiresAt', a.expires_at,
                                        'withdrawn', a.withdrawn_at is not null, 'active', a.withdrawn_at is null and a.expires_at > now(),
                                        'groups', (select count(*) from public.community_groups g where g.archived_at is null and lower(btrim(g.county)) = lower(btrim(a.county))))
                     order by a.created_at desc)
    from public.official_alerts a), '[]'::jsonb);
end $$;

create function public.admin_withdraw_official_alert(p_actor text, p_alert uuid) returns void
language plpgsql as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  update public.official_alerts set withdrawn_at = now() where id = p_alert and withdrawn_at is null;
  if not found then raise exception 'Alert not found' using errcode = '22023'; end if;
end $$;

-- For Home: the official alerts showing now in the counties of the groups this farm belongs to.
create function public.my_official_alerts(p_actor text) returns jsonb
language plpgsql stable as $$
declare farm uuid;
begin
  farm := public.community_farm(p_actor);
  return coalesce((
    select jsonb_agg(distinct a) from (
      select jsonb_array_elements(public.official_alerts_for(g.county)) as a
      from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
      where m.farm_id = farm) x), '[]'::jsonb);
end $$;

-- ───────────── Unread counts ─────────────

create table public.group_reads (
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Called when a person opens a group.
create function public.mark_group_read(p_actor text, p_group uuid) returns void
language plpgsql as $$
declare farm uuid;
begin
  farm := public.community_farm(p_actor);
  if not exists (select 1 from public.group_members where group_id = p_group and farm_id = farm) then
    raise exception 'Not a member of this group' using errcode = '42501';
  end if;
  insert into public.group_reads(group_id, user_id) values (p_group, p_actor)
  on conflict (group_id, user_id) do update set read_at = now();
end $$;

-- 0013's list_my_groups with an unread count: discussion posts from other farms and official alerts since this person
-- last opened the group (or since the farm joined, the first time).
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
             'lastPostAt', (select max(p.created_at) from public.group_posts p where p.group_id = g.id and p.kind <> 'outbreak'),
             'unread', (select count(*) from public.group_posts p
                         where p.group_id = g.id and p.kind = 'discussion' and p.farm_id <> farm
                           and p.created_at > coalesce(rd.read_at, m.joined_at))
                     + (select count(*) from public.official_alerts a
                         where lower(btrim(a.county)) = lower(btrim(g.county)) and a.withdrawn_at is null and a.expires_at > now()
                           and a.created_at > coalesce(rd.read_at, m.joined_at)))
           order by (select max(p.created_at) from public.group_posts p where p.group_id = g.id and p.kind <> 'outbreak') desc nulls last, g.name)
    from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
    left join public.group_reads rd on rd.group_id = g.id and rd.user_id = p_actor
    where m.farm_id = farm), '[]'::jsonb));
end $$;

-- 0013's list_group_alerts with the group's official alerts added (shown pinned, above the outbreak counts).
create or replace function public.list_group_alerts(p_actor text, p_group uuid) returns jsonb
language plpgsql stable as $$
declare farm uuid; can_post boolean; county text;
begin
  farm := public.community_farm(p_actor);
  select g.county into county from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
    where m.group_id = p_group and m.farm_id = farm;
  if county is null then raise exception 'Not a member of this group' using errcode = '42501'; end if;
  select m.role in ('owner', 'manager') into can_post from public.farm_memberships m where m.user_id = p_actor;
  return jsonb_build_object(
    'canAnswer', coalesce(can_post, false),
    'official', public.official_alerts_for(county),
    'clusters', public.group_alert_clusters(p_group, farm),
    'mine', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'createdAt', p.created_at, 'signs', p.report -> 'signs', 'animals', p.report -> 'animals') order by p.created_at desc)
      from public.group_posts p
      where p.group_id = p_group and p.kind = 'outbreak' and p.farm_id = farm and p.created_at > now() - interval '7 days'), '[]'::jsonb));
end $$;
