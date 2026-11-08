-- Per-record synchronisation.
--
-- Replaces whole-bucket writes (delete every row, re-insert the array) with
-- record-level operations:
-- * one versioned row per record in public.farm_records, with tombstones for deletes;
-- * a per-farm change sequence so devices download only what changed;
-- * idempotent operations (public.sync_operations), so a retried upload is never
--   applied twice;
-- * groups of operations (e.g. a delivery and the receipt taken with it) that are
--   applied all-or-nothing;
-- * append-only milk, delivery and payment records: after creation they may only be
--   voided, never edited or deleted;
-- * one audit entry per changed record.
--
-- Existing rows from the per-bucket tables are copied before those tables are dropped.

create table public.farm_records (
  farm_id uuid not null references public.farms(id) on delete cascade,
  bucket text not null check (bucket in ('farm','cows','buyers','milk','deliveries','payments','health','breeding','expenses','reminders')),
  id text not null check (length(id) between 1 and 160),
  version bigint not null default 1 check (version >= 1),
  change_seq bigint not null,
  deleted boolean not null default false,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  primary key (farm_id, bucket, id)
);
create index farm_records_changes_idx on public.farm_records(farm_id, change_seq);
create sequence public.farm_record_change_seq;

create table public.sync_operations (
  farm_id uuid not null references public.farms(id) on delete cascade,
  op_id uuid not null,
  group_id uuid not null,
  actor_id uuid not null references public.profiles(id),
  bucket text not null,
  record_id text not null,
  version bigint not null,
  change_seq bigint not null,
  applied_at timestamptz not null default now(),
  primary key (farm_id, op_id)
);

alter table public.audit_logs add column record_id text;

-- Carry over anything written by the bucket-level implementation.
do $$
declare t record;
begin
  for t in select * from (values
    ('cows','cows'),('buyers','buyers'),('milk','milk_entries'),('deliveries','deliveries'),('payments','payments'),
    ('health','health_events'),('breeding','breeding_events'),('expenses','expenses'),('reminders','reminders')) as v(bucket, tbl)
  loop
    execute format(
      'insert into public.farm_records(farm_id,bucket,id,version,change_seq,data) select farm_id,%L,id,1,nextval(''public.farm_record_change_seq''),data from public.%I',
      t.bucket, t.tbl);
  end loop;
  insert into public.farm_records(farm_id,bucket,id,version,change_seq,data)
    select id,'farm',id::text,greatest(revision,1),nextval('public.farm_record_change_seq'),data from public.farms;
end $$;

drop function public.write_farm_bucket(uuid,text,jsonb,bigint);
drop table public.farm_sync_state;
drop table public.cows, public.buyers, public.milk_entries, public.deliveries, public.payments,
  public.health_events, public.breeding_events, public.expenses, public.reminders;

alter table public.farm_records enable row level security;
alter table public.sync_operations enable row level security;
create policy farm_records_read on public.farm_records for select to authenticated
  using (exists(select 1 from public.farm_memberships m where m.farm_id = farm_records.farm_id and m.user_id = (select auth.uid())));
revoke all on public.farm_records, public.sync_operations from anon, authenticated;
grant select on public.farm_records to authenticated;
revoke all on sequence public.farm_record_change_seq from anon, authenticated;

-- New farms start with their profile as a farm record.
create or replace function public.provision_my_farm() returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); meta jsonb; email_address text; farm uuid; selected_plan text; price integer;
begin
  if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  if exists(select 1 from public.profiles where id=actor) then return; end if;
  select raw_user_meta_data,email into meta,email_address from auth.users where id=actor;
  if coalesce(length(btrim(meta->>'name')),0) not between 1 and 120
    or coalesce(length(btrim(meta->>'farmName')),0) not between 1 and 160
    or coalesce(length(btrim(meta->>'county')),0) not between 1 and 80
    or coalesce(length(meta->>'phone'),0)>32 or coalesce(length(meta->>'subCounty'),0)>80 then
    raise exception 'Valid farm onboarding information required' using errcode='22023';
  end if;
  selected_plan:=coalesce(meta->>'plan','farmer');
  if selected_plan not in ('starter','farmer','farm_pro') then selected_plan:='farmer'; end if;
  price:=case selected_plan when 'starter' then 500 when 'farm_pro' then 2500 else 1000 end;
  insert into public.profiles(id,email,name,phone) values(actor,email_address,btrim(meta->>'name'),coalesce(meta->>'phone',''));
  insert into public.farms(data) values(jsonb_build_object('name',btrim(meta->>'farmName'),'county',btrim(meta->>'county'),'subCounty',meta->>'subCounty',
    'ownerName',btrim(meta->>'name'),'phone',coalesce(meta->>'phone',''),'operatingStyle','individual','preferredLanguage',case when meta->>'language'='sw' then 'sw' else 'en' end,'currency','KSh','createdAt',now())) returning id into farm;
  update public.farms f set data=f.data||jsonb_build_object('id',farm) where f.id=farm;
  insert into public.farm_memberships(farm_id,user_id,role) values(farm,actor,'owner');
  insert into public.subscriptions values(farm,jsonb_build_object('plan',selected_plan,'status','trial','monthlyPriceKsh',price,'startDate',now(),'renewsAt',now()+interval '14 days'));
  insert into public.farm_records(farm_id,bucket,id,version,change_seq,data,updated_by)
    select farm,'farm',farm::text,1,nextval('public.farm_record_change_seq'),f.data,actor from public.farms f where f.id=farm;
end $$;
revoke all on function public.provision_my_farm() from public,anon;
grant execute on function public.provision_my_farm() to authenticated;

-- Apply a batch of record operations.
--
-- p_ops: [{opId, groupId, bucket, recordId, action: 'upsert'|'delete', baseVersion, data?}]
-- Returns: [{groupId, status: 'applied', ops: [{opId, version, seq}]}
--          | {groupId, status: 'conflict', conflicts: [{opId, bucket, recordId, reason, server}]}]
-- A group is applied completely or not at all. reason is 'changed' (the record
-- moved on since baseVersion) or 'immutable' (an edit/delete of an append-only record).
create function public.apply_farm_operations(p_farm uuid, p_ops jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
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
begin
  if actor is null or not exists(select 1 from public.farm_memberships where farm_id=p_farm and user_id=actor and role='owner') then
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
        if b is null or b not in ('farm','cows','buyers','milk','deliveries','payments','health','breeding','expenses','reminders')
          or r is null or length(r) not between 1 and 160 or act not in ('upsert','delete') or base is null or base < 0
          or (op->>'opId') is null or (op->>'groupId') is null then
          raise exception 'Invalid operation' using errcode='22023';
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

        if b in ('milk','deliveries','payments') and (act = 'delete' or (found_cur and (
             cur.deleted
             or (cur.data - void_keys) is distinct from (payload - void_keys)
             or (cur.data ? 'voidedAt' and payload->>'voidedAt' is null)))) then
          conflicts := conflicts || jsonb_build_object('opId', op->>'opId', 'bucket', b, 'recordId', r, 'reason', 'immutable',
            'server', case when found_cur then jsonb_build_object('version', cur.version, 'deleted', cur.deleted, 'data', cur.data) end);
          continue;
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
revoke all on function public.apply_farm_operations(uuid,jsonb) from public,anon;
grant execute on function public.apply_farm_operations(uuid,jsonb) to authenticated;
