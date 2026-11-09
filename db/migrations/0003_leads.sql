-- Website contact requests ("leads"), stored centrally so the administrator actually receives them.
--
-- Until now the contact form saved each message only in the visitor's own browser. Visitors are
-- not signed in, so the form posts to /api/leads, which calls submit_lead. That function limits how
-- fast one number (and the site as a whole) can submit. Reading and updating leads is limited to
-- platform administrators.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  phone text not null check (length(btrim(phone)) between 5 and 32),
  county text check (county is null or length(county) <= 80),
  cows_count integer check (cows_count is null or cows_count between 0 and 100000),
  preferred_contact text not null default 'call' check (preferred_contact in ('whatsapp','call','sms')),
  message text check (message is null or length(message) <= 2000),
  source text not null default 'website' check (length(source) <= 80),
  status text not null default 'new' check (status in ('new','contacted','converted','archived')),
  created_at timestamptz not null default now()
);
create index leads_created_idx on public.leads (created_at desc);

create function public.submit_lead(
  p_name text, p_phone text, p_county text, p_cows integer, p_contact text, p_message text, p_source text
) returns uuid language plpgsql as $$
declare lead uuid; digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if coalesce(length(btrim(p_name)), 0) not between 1 and 120 or length(digits) not between 7 and 15 then
    raise exception 'A name and a valid phone number are required' using errcode = '22023';
  end if;
  -- Flood protection: three messages per number and two hundred in total, per hour.
  if (select count(*) from public.leads where created_at > now() - interval '1 hour'
        and regexp_replace(phone, '[^0-9]', '', 'g') = digits) >= 3
     or (select count(*) from public.leads where created_at > now() - interval '1 hour') >= 200 then
    raise exception 'Too many requests' using errcode = 'MY429';
  end if;
  insert into public.leads (name, phone, county, cows_count, preferred_contact, message, source)
  values (btrim(p_name), btrim(p_phone), nullif(btrim(coalesce(p_county, '')), ''), p_cows,
          coalesce(p_contact, 'call'), nullif(btrim(coalesce(p_message, '')), ''), coalesce(nullif(btrim(p_source), ''), 'website'))
  returning id into lead;
  return lead;
end $$;

create function public.admin_list_leads(p_actor text)
returns setof public.leads language plpgsql stable as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  return query select * from public.leads order by created_at desc limit 500;
end $$;

create function public.admin_set_lead_status(p_actor text, p_lead uuid, p_status text)
returns void language plpgsql as $$
begin
  if not public.is_platform_admin(p_actor) then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_status not in ('new','contacted','converted','archived') then raise exception 'Invalid status' using errcode = '22023'; end if;
  update public.leads set status = p_status where id = p_lead;
  if not found then raise exception 'Lead not found' using errcode = '22023'; end if;
end $$;
