-- Team logins: more than one person per farm.
--
-- Until now every farm had one owner login. The membership table already allowed the roles owner, manager, worker and
-- advisor, so this adds what was missing: invitations, what each role may see and change, and a plan limit.
--
--   owner    everything, including the team, the plan and payments. Exactly one per farm.
--   manager  all farm records (milk, herd, sales, finance), but not the team or the plan.
--   worker   the daily work only: milk, cow health, breeding and reminders. Never sees money (buyers, deliveries,
--            payments, expenses, bills, statements). The server refuses anything else, so it holds even if a screen is wrong.
--   advisor  reserved, no access yet.
--
-- How someone joins: the owner creates an invitation (a one-time code, valid 7 days, kept only as a hash). The invited
-- person signs up or signs in and enters the code; that adds them to the owner's farm instead of creating a new one.
-- Logins per plan: Farm Pro 6 in all (owner plus five), other plans the owner only; see team_limit().
-- Administration counts farms (owners), so members are not counted as extra farm accounts.

create function public.farm_role(p_actor text, p_farm uuid) returns text
language sql stable as $$
  select role from public.farm_memberships where farm_id = p_farm and user_id = p_actor;
$$;

create function public.role_can_read(p_role text, p_bucket text) returns boolean
language sql immutable as $$
  select case
    when p_role in ('owner', 'manager') then true
    when p_role = 'worker' then p_bucket in ('farm', 'cows', 'milk', 'health', 'breeding', 'reminders')
    else false end;
$$;

create function public.role_can_write(p_role text, p_bucket text) returns boolean
language sql immutable as $$
  select case
    when p_role in ('owner', 'manager') then true
    when p_role = 'worker' then p_bucket in ('milk', 'health', 'breeding', 'reminders')
    else false end;
$$;

-- Total logins a plan includes (the owner counts as one).
create function public.team_limit(p_plan text) returns integer
language sql immutable as $$
  select case p_plan when 'farm_pro' then 6 else 1 end;
$$;

create table public.farm_invites (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  role text not null check (role in ('manager', 'worker')),
  label text check (label is null or length(label) <= 80),
  token_hash text not null unique,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_by text references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz
);
create index farm_invites_farm_idx on public.farm_invites (farm_id, created_at desc);

-- The one-time code is compared as a hash of its letters and digits only (any case, with or without dashes).
create function public.invite_hash(p_code text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'utf8')), 'hex');
$$;

-- Members and open invitations of a farm. Owner only.
create function public.list_farm_team(p_actor text, p_farm uuid) returns jsonb
language plpgsql stable as $$
declare plan text;
begin
  if public.farm_role(p_actor, p_farm) is distinct from 'owner' then raise exception 'Owner access required' using errcode = '42501'; end if;
  select details ->> 'plan' into plan from public.subscriptions where farm_id = p_farm;
  return jsonb_build_object(
    'limit', public.team_limit(plan),
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

-- A new invitation. Owner only, and only while the plan has room for another login (members plus open invitations).
-- The code is made by the server and shown to the owner once; only its hash is stored. Error code MY402 = plan full.
create function public.create_farm_invite(p_actor text, p_farm uuid, p_role text, p_label text, p_code text) returns uuid
language plpgsql as $$
declare plan text; taken integer; created uuid;
begin
  if public.farm_role(p_actor, p_farm) is distinct from 'owner' then raise exception 'Owner access required' using errcode = '42501'; end if;
  if p_role not in ('manager', 'worker') or coalesce(length(p_label), 0) > 80
     or length(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) < 8 then
    raise exception 'Invalid invitation' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_farm::text, 2));
  select details ->> 'plan' into plan from public.subscriptions where farm_id = p_farm;
  select (select count(*) from public.farm_memberships where farm_id = p_farm)
       + (select count(*) from public.farm_invites where farm_id = p_farm and accepted_at is null and revoked_at is null and expires_at > now())
    into taken;
  if taken >= public.team_limit(plan) then raise exception 'Team full for this plan' using errcode = 'MY402'; end if;
  insert into public.farm_invites(farm_id, role, label, token_hash, created_by, expires_at)
  values (p_farm, p_role, nullif(btrim(coalesce(p_label, '')), ''), public.invite_hash(p_code), p_actor, now() + interval '7 days')
  returning id into created;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (p_farm, p_actor, 'team.invite', 'team', 0, created::text);
  return created;
end $$;

create function public.revoke_farm_invite(p_actor text, p_farm uuid, p_invite uuid) returns void
language plpgsql as $$
begin
  if public.farm_role(p_actor, p_farm) is distinct from 'owner' then raise exception 'Owner access required' using errcode = '42501'; end if;
  update public.farm_invites set revoked_at = now()
    where id = p_invite and farm_id = p_farm and accepted_at is null and revoked_at is null;
  if not found then raise exception 'Invitation not found' using errcode = '22023'; end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (p_farm, p_actor, 'team.invite.revoke', 'team', 0, p_invite::text);
end $$;

-- Joins the signed-in person to the farm the code belongs to. Only for someone who is not already in a farm.
create function public.accept_farm_invite(p_actor text, p_email text, p_name text, p_phone text, p_code text) returns uuid
language plpgsql as $$
declare inv public.farm_invites%rowtype; plan text; members integer;
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
  select details ->> 'plan' into plan from public.subscriptions where farm_id = inv.farm_id;
  select count(*) into members from public.farm_memberships where farm_id = inv.farm_id;
  if members >= public.team_limit(plan) then raise exception 'Team full for this plan' using errcode = 'MY402'; end if;
  insert into public.profiles(id, email, name, phone) values (p_actor, lower(btrim(p_email)), btrim(p_name), coalesce(p_phone, ''))
    on conflict (id) do nothing;
  insert into public.farm_memberships(farm_id, user_id, role) values (inv.farm_id, p_actor, inv.role);
  update public.farm_invites set accepted_by = p_actor, accepted_at = now() where id = inv.id;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (inv.farm_id, p_actor, 'team.join', 'team', 0, inv.id::text);
  return inv.farm_id;
end $$;

create function public.set_member_role(p_actor text, p_farm uuid, p_member text, p_role text) returns void
language plpgsql as $$
begin
  if public.farm_role(p_actor, p_farm) is distinct from 'owner' then raise exception 'Owner access required' using errcode = '42501'; end if;
  if p_role not in ('manager', 'worker') then raise exception 'Invalid role' using errcode = '22023'; end if;
  update public.farm_memberships set role = p_role where farm_id = p_farm and user_id = p_member and role <> 'owner';
  if not found then raise exception 'Member not found' using errcode = '22023'; end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (p_farm, p_actor, 'team.role', 'team', 0, p_member);
end $$;

-- Takes someone off the farm. They lose access at once (every request is checked here). Their account and anything
-- they recorded stay; the owner cannot be removed.
create function public.remove_farm_member(p_actor text, p_farm uuid, p_member text) returns void
language plpgsql as $$
begin
  if public.farm_role(p_actor, p_farm) is distinct from 'owner' then raise exception 'Owner access required' using errcode = '42501'; end if;
  delete from public.farm_memberships where farm_id = p_farm and user_id = p_member and role <> 'owner';
  if not found then raise exception 'Member not found' using errcode = '22023'; end if;
  insert into public.audit_logs(farm_id, actor_id, action, bucket, revision, record_id) values (p_farm, p_actor, 'team.remove', 'team', 0, p_member);
end $$;

-- Records changed after p_since, limited to what the caller's role may see. A worker never receives money records.
create or replace function public.farm_changes(p_farm uuid, p_actor text, p_since bigint, p_limit integer)
returns table(bucket text, id text, version bigint, change_seq bigint, deleted boolean, data jsonb)
language plpgsql stable as $$
declare my_role text;
begin
  select m.role into my_role from public.farm_memberships m where m.farm_id = p_farm and m.user_id = p_actor;
  if p_actor is null or my_role is null then
    raise exception 'Farm access denied' using errcode = '42501';
  end if;
  return query
    select r.bucket, r.id, r.version, r.change_seq, r.deleted, r.data
    from public.farm_records r
    where r.farm_id = p_farm and r.change_seq > greatest(p_since, 0) and public.role_can_read(my_role, r.bucket)
    order by r.change_seq
    limit least(greatest(p_limit, 1), 1000);
end $$;

-- The functions below are the originals with only the lines for roles, the member role and the owner-only counts changed.

create or replace function public.apply_farm_operations(p_farm uuid, p_actor text, p_ops jsonb)
returns jsonb language plpgsql as $$
declare
  actor text := p_actor;
  results jsonb := '[]'::jsonb;
  grp record;
  op jsonb;
  applied jsonb;
  conflicts jsonb;
  b text; r text; act text; base bigint; payload jsonb;
  cur public.farm_records%rowtype;
  found_cur boolean;
  prior public.sync_operations%rowtype;
  seq bigint; new_version bigint;
  void_keys text[] := array['voidedAt','voidReason','replacedById','synced'];
  my_role text;
begin
  select m.role into my_role from public.farm_memberships m where m.farm_id = p_farm and m.user_id = actor;
  if actor is null or my_role is null then
    raise exception 'Farm access denied' using errcode='42501';
  end if;
  if p_ops is null or jsonb_typeof(p_ops) <> 'array' or jsonb_array_length(p_ops) > 500 or octet_length(p_ops::text) > 4194304 then
    raise exception 'Invalid operations' using errcode='22023';
  end if;
  -- Serialise writers per farm so change_seq order matches commit order for readers.
  perform pg_advisory_xact_lock(hashtextextended(p_farm::text, 1));

  for grp in
    select x->>'groupId' as group_id, min(o) as first_pos
    from jsonb_array_elements(p_ops) with ordinality t(x, o)
    group by x->>'groupId' order by min(o)
  loop
    applied := '[]'::jsonb;
    conflicts := '[]'::jsonb;
    begin
      for op in
        select x from jsonb_array_elements(p_ops) with ordinality t(x, o)
        where x->>'groupId' = grp.group_id order by o
      loop
        b := op->>'bucket'; r := op->>'recordId'; act := op->>'action';
        base := (op->>'baseVersion')::bigint; payload := op->'data';
        if b is null or b not in ('farm','cows','buyers','milk','deliveries','payments','health','breeding','expenses','reminders','statements','bills','allocations')
          or r is null or length(r) not between 1 and 160 or act not in ('upsert','delete') or base is null or base < 0
          or (op->>'opId') is null or (op->>'groupId') is null then
          raise exception 'Invalid operation' using errcode='22023';
        end if;
        if not public.role_can_write(my_role, b) then
          raise exception 'Your role cannot change this kind of record' using errcode='42501';
        end if;
        if act = 'upsert' then
          if payload is null or jsonb_typeof(payload) <> 'object' or payload->>'id' is distinct from r or octet_length(payload::text) > 1048576 then
            raise exception 'Invalid record' using errcode='22023';
          end if;
          if b = 'farm' then
            if r <> p_farm::text then raise exception 'Invalid farm record' using errcode='22023'; end if;
          elsif payload->>'farmId' is distinct from p_farm::text then
            raise exception 'Record belongs to another farm' using errcode='22023';
          end if;
        elsif b = 'farm' then
          raise exception 'The farm profile cannot be deleted' using errcode='22023';
        end if;

        -- Idempotent retry: an operation already applied returns its original result.
        select * into prior from public.sync_operations where farm_id=p_farm and op_id=(op->>'opId')::uuid;
        if found then
          applied := applied || jsonb_build_object('opId', op->>'opId', 'version', prior.version, 'seq', prior.change_seq, 'replayed', true);
          continue;
        end if;

        select * into cur from public.farm_records where farm_id=p_farm and bucket=b and id=r for update;
        found_cur := found;

        if (found_cur and cur.version <> base) or (not found_cur and base <> 0) then
          conflicts := conflicts || jsonb_build_object('opId', op->>'opId', 'bucket', b, 'recordId', r, 'reason', 'changed',
            'server', case when found_cur then jsonb_build_object('version', cur.version, 'deleted', cur.deleted, 'data', cur.data) end);
          continue;
        end if;

        if b in ('milk','deliveries','payments','statements','bills','allocations') and (act = 'delete' or (found_cur and (
             cur.deleted
             or (cur.data - void_keys) is distinct from (payload - void_keys)
             or (cur.data ? 'voidedAt' and payload->>'voidedAt' is null)))) then
          conflicts := conflicts || jsonb_build_object('opId', op->>'opId', 'bucket', b, 'recordId', r, 'reason', 'immutable',
            'server', case when found_cur then jsonb_build_object('version', cur.version, 'deleted', cur.deleted, 'data', cur.data) end);
          continue;
        end if;

        -- A delivery may be on only one active bill.
        if b = 'bills' and act = 'upsert' and payload->>'voidedAt' is null and exists(
             select 1 from public.farm_records o
             where o.farm_id = p_farm and o.bucket = 'bills' and o.id <> r and not o.deleted
               and o.data->>'voidedAt' is null
               and o.data->'deliveryIds' ?| array(select jsonb_array_elements_text(coalesce(payload->'deliveryIds', '[]'::jsonb)))) then
          conflicts := conflicts || jsonb_build_object('opId', op->>'opId', 'bucket', b, 'recordId', r, 'reason', 'duplicate', 'server', null);
          continue;
        end if;

        -- One active statement per cooperative per period.
        if b = 'statements' and act = 'upsert' and payload->>'voidedAt' is null and exists(
             select 1 from public.farm_records o
             where o.farm_id = p_farm and o.bucket = 'statements' and o.id <> r and not o.deleted
               and o.data->>'voidedAt' is null
               and o.data->>'buyerId' = payload->>'buyerId'
               and o.data->>'periodFrom' <= payload->>'periodTo'
               and o.data->>'periodTo' >= payload->>'periodFrom') then
          conflicts := conflicts || jsonb_build_object('opId', op->>'opId', 'bucket', b, 'recordId', r, 'reason', 'duplicate', 'server', null);
          continue;
        end if;

        -- An allocation needs a live payment of the same buyer with enough left.
        if b = 'allocations' and act = 'upsert' and not found_cur and payload->>'voidedAt' is null then
          declare
            pay public.farm_records%rowtype;
            used numeric;
          begin
            select * into pay from public.farm_records
              where farm_id = p_farm and bucket = 'payments' and id = payload->>'paymentId' and not deleted;
            select coalesce(sum((o.data->>'amount')::numeric), 0) into used from public.farm_records o
              where o.farm_id = p_farm and o.bucket = 'allocations' and not o.deleted
                and o.data->>'voidedAt' is null and o.data->>'paymentId' = payload->>'paymentId';
            if pay.id is null or pay.data->>'voidedAt' is not null
               or pay.data->>'buyerId' is distinct from payload->>'buyerId'
               or coalesce((payload->>'amount')::numeric, 0) <= 0
               or used + (payload->>'amount')::numeric > (pay.data->>'amount')::numeric + 0.005 then
              conflicts := conflicts || jsonb_build_object('opId', op->>'opId', 'bucket', b, 'recordId', r, 'reason', 'invalid_allocation', 'server', null);
              continue;
            end if;
          end;
        end if;

        seq := nextval('public.farm_record_change_seq');
        if found_cur then
          new_version := cur.version + 1;
          update public.farm_records set version=new_version, change_seq=seq, deleted=(act='delete'),
            data=case when act='upsert' then payload else cur.data end, updated_at=now(), updated_by=actor
          where farm_id=p_farm and bucket=b and id=r;
        else
          new_version := 1;
          insert into public.farm_records(farm_id,bucket,id,version,change_seq,deleted,data,updated_by)
          values(p_farm,b,r,1,seq,act='delete',coalesce(payload, jsonb_build_object('id', r)),actor);
        end if;
        if b = 'farm' then update public.farms set data=payload, revision=new_version where id=p_farm; end if;

        insert into public.sync_operations(farm_id,op_id,group_id,actor_id,bucket,record_id,version,change_seq)
        values(p_farm,(op->>'opId')::uuid,(op->>'groupId')::uuid,actor,b,r,new_version,seq);
        insert into public.audit_logs(farm_id,actor_id,action,bucket,revision,record_id)
        values(p_farm,actor,
          case when act='delete' then 'record.delete'
               when payload ? 'voidedAt' and not (found_cur and cur.data ? 'voidedAt') then 'record.void'
               when found_cur then 'record.update' else 'record.create' end,
          b,new_version,r);
        applied := applied || jsonb_build_object('opId', op->>'opId', 'version', new_version, 'seq', seq);
      end loop;

      if jsonb_array_length(conflicts) > 0 then
        raise exception 'group conflict' using errcode='MY409';
      end if;
      results := results || jsonb_build_object('groupId', grp.group_id, 'status', 'applied', 'ops', applied);
    exception when sqlstate 'MY409' then
      -- Everything this group wrote is rolled back; the conflicts were captured above.
      results := results || jsonb_build_object('groupId', grp.group_id, 'status', 'conflict', 'conflicts', conflicts);
    end;
  end loop;
  return results;
end $$;

create or replace function public.get_account(p_actor text) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', p.id, 'email', p.email, 'name', p.name, 'phone', p.phone, 'role', p.role,
    'createdAt', p.created_at, 'farmId', m.farm_id, 'subscription', s.details, 'farmRole', m.role)
  from public.profiles p
  left join public.farm_memberships m on m.user_id = p.id
  left join public.subscriptions s on s.farm_id = m.farm_id
  where p.id = p_actor;
$$;

create or replace function public.admin_list_accounts(p_actor text)
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
    where m.role is null or m.role = 'owner'
    order by p.created_at desc limit 500;
end $$;

create or replace function public.admin_usage(p_actor text, p_at timestamptz default null) returns jsonb
language plpgsql stable as $$
declare at timestamptz;
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  at := least(coalesce(p_at, now()), now());
  return jsonb_build_object(
    'asAt', at,
    'accounts', (select count(*) from public.profiles pr where pr.role = 'farmer' and pr.created_at <= at
                  and not exists (select 1 from public.farm_memberships mm where mm.user_id = pr.id and mm.role <> 'owner')),
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
                   from public.profiles p join public.farm_memberships m on m.user_id = p.id and m.role = 'owner' join public.subscriptions s on s.farm_id = m.farm_id
                   where p.role = 'farmer' and p.created_at <= at group by 1) x), '{}'::jsonb),
    'byPlan', coalesce((select jsonb_object_agg(x.k, x.n) from (
                   select s.details->>'plan' as k, count(*) as n
                   from public.profiles p join public.farm_memberships m on m.user_id = p.id and m.role = 'owner' join public.subscriptions s on s.farm_id = m.farm_id
                   where p.role = 'farmer' and p.created_at <= at group by 1) x), '{}'::jsonb),
    'monthlyValueKsh', coalesce((select sum((s.details->>'monthlyPriceKsh')::int)
                   from public.profiles p join public.farm_memberships m on m.user_id = p.id and m.role = 'owner' join public.subscriptions s on s.farm_id = m.farm_id
                   where p.role = 'farmer' and p.created_at <= at and s.details->>'status' = 'active'), 0),
    'signups', (select jsonb_agg(jsonb_build_object('day', x.d, 'count', x.n) order by x.d) from (
                   select g::date as d, (select count(*) from public.profiles p
                                          where p.role = 'farmer' and (p.created_at at time zone 'Africa/Nairobi')::date = g::date
                                            and not exists (select 1 from public.farm_memberships mm where mm.user_id = p.id and mm.role <> 'owner')) as n
                   from generate_series(((at at time zone 'Africa/Nairobi')::date - 13)::timestamp,
                                        (at at time zone 'Africa/Nairobi')::date::timestamp, interval '1 day') g) x)
  );
end $$;
