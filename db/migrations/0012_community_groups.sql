-- Community, step 1 of 3: SACCO and area groups, invitation links and a plain discussion.
-- Design: docs/community-groups-design.md. Outbreak reports are step 2 (0013); moderation and official alerts are step 3 (0014).
--
-- Who can do what
--   * Mylkio staff (platform administrators) create a group for a real SACCO or area and make invitation links.
--     Every group is therefore verified. Staff see group names and counts here, never what members write.
--   * A FARM is the member of a group (not one login): the owner or a manager joins with a link and may post and reply.
--     Workers on that farm may read, never write. Advisors have no access.
--   * Only farms on Farm Pro or Custom can use Community. The plan is checked in SQL (community_allowed) and again by the
--     server, so a hidden button is never the only protection.
--
-- Limits (so a stuck button or an abusive account cannot flood a group)
--   300 farms per group, a farm in at most 5 groups, 10 posts and 30 replies per farm per hour,
--   600 characters in a post, 400 in a reply.
--
-- Error codes used here (the server maps them): 42501 no access, 22023 refused input, MY403 plan does not include
-- Community, MY429 too many in an hour, MY431 group full, MY432 farm already in 5 groups.
--
-- Additive: new tables and functions only. Nothing existing is changed.

-- Does this subscription include Community? Mirrors featuresFor() in lib/plans.ts and extrasLapsed() in lib/billing.ts:
-- Farm Pro or Custom, not cancelled, and not past the paid-until date (no grace for a trial, 7 days for a paid plan).
-- A test runs both over the same subscriptions so they cannot drift.
create function public.community_allowed(p_details jsonb) returns boolean
language sql stable as $$
  select coalesce(
    (p_details ->> 'plan') in ('farm_pro', 'custom')
    and coalesce(p_details ->> 'status', '') <> 'cancelled'
    and not ((p_details ->> 'renewsAt') is not null
             and now() > (p_details ->> 'renewsAt')::timestamptz
                         + case when p_details ->> 'status' = 'trial' then interval '0 days' else interval '7 days' end),
    false);
$$;

-- The caller's farm, provided the plan includes Community. Reading is open to owner, manager and worker; writing
-- (p_write) is for owner and manager.
create function public.community_farm(p_actor text, p_write boolean default false) returns uuid
language plpgsql stable as $$
declare farm uuid; my_role text; sub jsonb;
begin
  select m.farm_id, m.role into farm, my_role from public.farm_memberships m where m.user_id = p_actor;
  if farm is null or my_role not in ('owner', 'manager', 'worker') then raise exception 'Farm access denied' using errcode = '42501'; end if;
  select details into sub from public.subscriptions where farm_id = farm;
  if not public.community_allowed(sub) then raise exception 'Community is not part of this plan' using errcode = 'MY403'; end if;
  if p_write and my_role not in ('owner', 'manager') then raise exception 'Only the owner or a manager can do this' using errcode = '42501'; end if;
  return farm;
end $$;

-- ───────────── Tables ─────────────

create table public.community_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 3 and 80),
  kind text not null check (kind in ('sacco', 'area')),
  county text not null check (length(btrim(county)) between 2 and 80),
  description text check (description is null or length(description) <= 300),
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index community_groups_county_idx on public.community_groups (lower(county));

create table public.group_members (
  group_id uuid not null references public.community_groups(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  -- 'admin' is the person or farm the SACCO trusts to look after the group (their tools arrive in step 3).
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  joined_by text references public.profiles(id) on delete set null,
  primary key (group_id, farm_id)
);
create index group_members_farm_idx on public.group_members (farm_id);

-- A link a member opens to join. Kept only as a hash, with a limited number of uses and an expiry.
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  label text check (label is null or length(label) <= 80),
  token_hash text not null unique,
  max_uses integer not null check (max_uses between 1 and 300),
  uses integer not null default 0 check (uses >= 0),
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index group_invites_group_idx on public.group_invites (group_id, created_at desc);

-- Posts and replies are stored on the server (they must reach other farms), unlike a farm's own records. They are removed
-- by the database when the farm, the group or the post is removed. `kind` already allows the two kinds that come in
-- steps 2 and 3, so those steps only add columns; nothing creates them yet, and an official alert has no farm.
create table public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete cascade,
  author_id text references public.profiles(id) on delete set null,
  kind text not null default 'discussion' check (kind in ('discussion', 'outbreak', 'official')),
  body text not null check (length(btrim(body)) between 1 and 600),
  created_at timestamptz not null default now(),
  check (kind = 'official' or farm_id is not null)
);
create index group_posts_feed_idx on public.group_posts (group_id, created_at desc);
create index group_posts_farm_idx on public.group_posts (farm_id, created_at desc);

create table public.group_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  author_id text references public.profiles(id) on delete set null,
  body text not null check (length(btrim(body)) between 1 and 400),
  created_at timestamptz not null default now()
);
create index group_replies_post_idx on public.group_replies (post_id, created_at);
create index group_replies_farm_idx on public.group_replies (farm_id, created_at desc);

-- ───────────── Joining and leaving (a farm's owner or manager) ─────────────

-- Joins the caller's farm to the group an invitation belongs to. A wrong, used, expired or withdrawn code all look the
-- same (22023). A farm already in the group does not use up the invitation (but an admin invitation makes it an admin).
create function public.join_group(p_actor text, p_code text) returns uuid
language plpgsql as $$
declare farm uuid; inv public.group_invites%rowtype; grp public.community_groups%rowtype; have public.group_members%rowtype; members integer; mine integer;
begin
  farm := public.community_farm(p_actor, true);
  perform pg_advisory_xact_lock(hashtextextended(farm::text, 3));
  select * into inv from public.group_invites
    where token_hash = public.invite_hash(p_code) and revoked_at is null and expires_at > now() and uses < max_uses
    for update;
  if not found then raise exception 'Invitation not valid' using errcode = '22023'; end if;
  select * into grp from public.community_groups where id = inv.group_id and archived_at is null;
  if not found then raise exception 'Invitation not valid' using errcode = '22023'; end if;

  select * into have from public.group_members where group_id = grp.id and farm_id = farm;
  if found then
    if have.role = 'member' and inv.role = 'admin' then
      update public.group_members set role = 'admin' where group_id = grp.id and farm_id = farm;
      update public.group_invites set uses = uses + 1 where id = inv.id;
    end if;
    return grp.id;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(grp.id::text, 4));
  select count(*) into members from public.group_members where group_id = grp.id;
  if members >= 300 then raise exception 'This group is full' using errcode = 'MY431'; end if;
  select count(*) into mine from public.group_members m join public.community_groups g on g.id = m.group_id
    where m.farm_id = farm and g.archived_at is null;
  if mine >= 5 then raise exception 'A farm can be in up to 5 groups' using errcode = 'MY432'; end if;

  insert into public.group_members(group_id, farm_id, role, joined_by) values (grp.id, farm, inv.role, p_actor);
  update public.group_invites set uses = uses + 1 where id = inv.id;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (farm, p_actor, 'community.join', 'community', 0, grp.id::text);
  return grp.id;
end $$;

-- Takes the caller's farm out of a group, at any time. With p_delete_posts the farm's posts and replies there are deleted too.
create function public.leave_group(p_actor text, p_group uuid, p_delete_posts boolean default false) returns void
language plpgsql as $$
declare farm uuid;
begin
  farm := public.community_farm(p_actor, true);
  delete from public.group_members where group_id = p_group and farm_id = farm;
  if not found then raise exception 'Not a member of this group' using errcode = '42501'; end if;
  if p_delete_posts then
    delete from public.group_replies where farm_id = farm and post_id in (select id from public.group_posts where group_id = p_group);
    delete from public.group_posts where group_id = p_group and farm_id = farm;
  end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (farm, p_actor, 'community.leave', 'community', 0, p_group::text);
end $$;

-- ───────────── Reading (owner, manager and worker) ─────────────

create function public.list_my_groups(p_actor text) returns jsonb
language plpgsql stable as $$
declare farm uuid; can_post boolean;
begin
  farm := public.community_farm(p_actor);
  select m.role in ('owner', 'manager') into can_post from public.farm_memberships m where m.user_id = p_actor;
  return jsonb_build_object('canPost', coalesce(can_post, false), 'groups', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', g.id, 'name', g.name, 'kind', g.kind, 'county', g.county, 'description', g.description, 'role', m.role,
             'members', (select count(*) from public.group_members x where x.group_id = g.id),
             'lastPostAt', (select max(p.created_at) from public.group_posts p where p.group_id = g.id))
           order by (select max(p.created_at) from public.group_posts p where p.group_id = g.id) desc nulls last, g.name)
    from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
    where m.farm_id = farm), '[]'::jsonb));
end $$;

-- The newest posts of a group, p_limit at a time (older ones with p_before). Members only.
create function public.list_group_posts(p_actor text, p_group uuid, p_before timestamptz default null, p_limit integer default 30) returns jsonb
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
      where p.group_id = p_group and (p_before is null or p.created_at < p_before)
      order by p.created_at desc limit lim + 1) s) q;

  return jsonb_build_object('group', grp, 'canPost', coalesce(can_post, false), 'posts', posts, 'more', more);
end $$;

-- One post with all its replies, oldest first. Members only.
create function public.get_group_post(p_actor text, p_post uuid) returns jsonb
language plpgsql stable as $$
declare farm uuid; post public.group_posts%rowtype; can_post boolean; item jsonb;
begin
  farm := public.community_farm(p_actor);
  select * into post from public.group_posts where id = p_post;
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

-- ───────────── Writing (owner and manager) ─────────────

create function public.create_group_post(p_actor text, p_group uuid, p_body text) returns uuid
language plpgsql as $$
declare farm uuid; created uuid;
begin
  farm := public.community_farm(p_actor, true);
  if not exists (select 1 from public.group_members m join public.community_groups g on g.id = m.group_id and g.archived_at is null
                 where m.group_id = p_group and m.farm_id = farm) then
    raise exception 'Not a member of this group' using errcode = '42501';
  end if;
  if coalesce(length(btrim(p_body)), 0) not between 1 and 600 then raise exception 'A post needs 1 to 600 characters' using errcode = '22023'; end if;
  -- Ten posts an hour per farm.
  if (select count(*) from public.group_posts where farm_id = farm and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many posts' using errcode = 'MY429';
  end if;
  insert into public.group_posts(group_id, farm_id, author_id, kind, body) values (p_group, farm, p_actor, 'discussion', btrim(p_body))
    returning id into created;
  return created;
end $$;

create function public.create_group_reply(p_actor text, p_post uuid, p_body text) returns uuid
language plpgsql as $$
declare farm uuid; post public.group_posts%rowtype; created uuid;
begin
  farm := public.community_farm(p_actor, true);
  select * into post from public.group_posts where id = p_post;
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

-- A farm may delete what it posted (its replies go with the post).
create function public.delete_group_post(p_actor text, p_post uuid) returns void
language plpgsql as $$
declare farm uuid;
begin
  farm := public.community_farm(p_actor, true);
  delete from public.group_posts where id = p_post and farm_id = farm;
  if not found then raise exception 'Post not found' using errcode = '22023'; end if;
end $$;

create function public.delete_group_reply(p_actor text, p_reply uuid) returns void
language plpgsql as $$
declare farm uuid;
begin
  farm := public.community_farm(p_actor, true);
  delete from public.group_replies where id = p_reply and farm_id = farm;
  if not found then raise exception 'Reply not found' using errcode = '22023'; end if;
end $$;

-- ───────────── Administration (Mylkio staff) ─────────────

-- Creates a group (p_id null) or edits one; p_archived hides it from members without deleting anything.
create function public.admin_save_group(p_actor text, p_id uuid, p_name text, p_kind text, p_county text, p_description text, p_archived boolean default false) returns uuid
language plpgsql as $$
declare saved uuid;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if coalesce(length(btrim(p_name)), 0) not between 3 and 80 or p_kind not in ('sacco', 'area')
     or coalesce(length(btrim(p_county)), 0) not between 2 and 80 or length(coalesce(p_description, '')) > 300 then
    raise exception 'Invalid group' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.community_groups(name, kind, county, description, created_by)
    values (btrim(p_name), p_kind, btrim(p_county), nullif(btrim(coalesce(p_description, '')), ''), p_actor) returning id into saved;
  else
    update public.community_groups set name = btrim(p_name), kind = p_kind, county = btrim(p_county),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      archived_at = case when coalesce(p_archived, false) then coalesce(archived_at, now()) else null end
    where id = p_id returning id into saved;
    if saved is null then raise exception 'Group not found' using errcode = '22023'; end if;
  end if;
  return saved;
end $$;

-- Every group with counts only. Staff do not read what members write.
create function public.admin_list_groups(p_actor text) returns jsonb
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'kind', g.kind, 'county', g.county, 'description', g.description,
      'archived', g.archived_at is not null, 'createdAt', g.created_at,
      'members', (select count(*) from public.group_members m where m.group_id = g.id),
      'openInvites', (select count(*) from public.group_invites i where i.group_id = g.id and i.revoked_at is null and i.expires_at > now() and i.uses < i.max_uses))
      order by g.archived_at is not null, g.created_at desc)
    from public.community_groups g), '[]'::jsonb);
end $$;

-- A new invitation link for a group. The code is made by the server and shown once; only its hash is stored.
create function public.admin_create_group_invite(p_actor text, p_group uuid, p_role text, p_label text, p_code text, p_max_uses integer, p_days integer) returns uuid
language plpgsql as $$
declare created uuid;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_role not in ('member', 'admin') or coalesce(length(p_label), 0) > 80 or p_max_uses not between 1 and 300 or p_days not between 1 and 60
     or length(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) < 8
     or not exists (select 1 from public.community_groups where id = p_group and archived_at is null) then
    raise exception 'Invalid invitation' using errcode = '22023';
  end if;
  insert into public.group_invites(group_id, role, label, token_hash, max_uses, created_by, expires_at)
  values (p_group, p_role, nullif(btrim(coalesce(p_label, '')), ''), public.invite_hash(p_code), p_max_uses, p_actor, now() + make_interval(days => p_days))
  returning id into created;
  return created;
end $$;

create function public.admin_list_group_invites(p_actor text, p_group uuid) returns jsonb
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', i.id, 'role', i.role, 'label', i.label, 'uses', i.uses, 'maxUses', i.max_uses,
                                        'createdAt', i.created_at, 'expiresAt', i.expires_at) order by i.created_at desc)
    from public.group_invites i
    where i.group_id = p_group and i.revoked_at is null and i.expires_at > now() and i.uses < i.max_uses), '[]'::jsonb);
end $$;

create function public.admin_revoke_group_invite(p_actor text, p_invite uuid) returns void
language plpgsql as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  update public.group_invites set revoked_at = now() where id = p_invite and revoked_at is null;
  if not found then raise exception 'Invitation not found' using errcode = '22023'; end if;
end $$;

-- The farms in a group: names and places only, as the accounts list shows them.
create function public.admin_list_group_members(p_actor text, p_group uuid) returns jsonb
language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('farmId', m.farm_id, 'farmName', f.data ->> 'name', 'county', f.data ->> 'county',
                                        'subCounty', f.data ->> 'subCounty', 'role', m.role, 'joinedAt', m.joined_at)
                     order by (m.role = 'admin') desc, m.joined_at)
    from public.group_members m join public.farms f on f.id = m.farm_id
    where m.group_id = p_group), '[]'::jsonb);
end $$;

create function public.admin_remove_group_member(p_actor text, p_group uuid, p_farm uuid) returns void
language plpgsql as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  delete from public.group_members where group_id = p_group and farm_id = p_farm;
  if not found then raise exception 'Member not found' using errcode = '22023'; end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (p_farm, p_actor, 'community.remove', 'community', 0, p_group::text);
end $$;
