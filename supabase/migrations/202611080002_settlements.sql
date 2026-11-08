-- Phase 4: cooperative statements, customer bills and payment allocations.
--
-- Adds three append-only record types to per-record sync and enforces, on the server:
-- * a delivery can be on only one active customer bill (no double billing, even
--   when two devices bill offline);
-- * a cooperative has at most one active statement for any period;
-- * a payment can never be allocated beyond its amount, to a voided payment, or to
--   another buyer's payment.
-- Refusals are returned as conflicts with reason 'duplicate' or 'invalid_allocation'.

alter table public.farm_records drop constraint farm_records_bucket_check;
alter table public.farm_records add constraint farm_records_bucket_check
  check (bucket in ('farm','cows','buyers','milk','deliveries','payments','health','breeding','expenses','reminders','statements','bills','allocations'));

create or replace function public.apply_farm_operations(p_farm uuid, p_ops jsonb)
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
        if b is null or b not in ('farm','cows','buyers','milk','deliveries','payments','health','breeding','expenses','reminders','statements','bills','allocations')
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
revoke all on function public.apply_farm_operations(uuid,jsonb) from public,anon;
grant execute on function public.apply_farm_operations(uuid,jsonb) to authenticated;
