-- ============================================================
-- OWNER STATEMENT DELIVERY IDEMPOTENCY
-- ============================================================

create unique index if not exists
  uq_owner_statement_deliveries_provider_reference
on public.owner_statement_deliveries (
  provider,
  provider_reference
)
where
  provider is not null
  and provider_reference is not null;


-- ============================================================
-- MARK STATEMENT SENT
-- Prevent duplicate delivery history for the same provider id.
-- ============================================================

create or replace function public.mark_owner_statement_sent(
  p_statement_id uuid,
  p_channel text,
  p_sent_to text,
  p_sent_reference text default null
)
returns public.owner_statements
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_statement public.owner_statements;
  v_now timestamptz := now();
  v_sent_reference text;
begin

  if not public.is_staff(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  if p_statement_id is null then
    raise exception 'Le releve est obligatoire';
  end if;

  if p_channel not in (
    'email',
    'whatsapp',
    'manual'
  ) then
    raise exception 'Canal invalide';
  end if;

  if nullif(btrim(p_sent_to), '') is null then
    raise exception 'Le destinataire est obligatoire';
  end if;

  select *
  into v_statement
  from public.owner_statements
  where id = p_statement_id
  for update;

  if not found then
    raise exception 'Releve introuvable';
  end if;

  if v_statement.status = 'cancelled' then
    raise exception 'Un releve annule ne peut pas etre envoye';
  end if;

  v_sent_reference :=
    nullif(
      btrim(
        coalesce(
          p_sent_reference,
          ''
        )
      ),
      ''
    );

  update public.owner_statements
  set
    status = 'sent',
    sent_at = coalesce(sent_at, v_now),
    sent_channel = p_channel,
    sent_to = btrim(p_sent_to),
    sent_reference = v_sent_reference,
    updated_at = v_now
  where id = p_statement_id
  returning *
  into v_statement;

  insert into public.owner_statement_deliveries (
    statement_id,
    channel,
    sent_to,
    provider,
    provider_reference,
    status,
    sent_by,
    sent_at
  )
  values (
    p_statement_id,
    p_channel,
    btrim(p_sent_to),

    case
      when p_channel = 'email'
        then 'resend'
      else null
    end,

    v_sent_reference,
    'sent',
    auth.uid(),
    v_now
  )
  on conflict (
    provider,
    provider_reference
  )
  where
    provider is not null
    and provider_reference is not null
  do nothing;

  return v_statement;

end;
$function$;


-- ============================================================
-- FUNCTION PRIVILEGES
-- ============================================================

revoke all
on function public.mark_owner_statement_sent(
  uuid,
  text,
  text,
  text
)
from public;

revoke all
on function public.mark_owner_statement_sent(
  uuid,
  text,
  text,
  text
)
from anon;

revoke all
on function public.mark_owner_statement_sent(
  uuid,
  text,
  text,
  text
)
from authenticated;

grant execute
on function public.mark_owner_statement_sent(
  uuid,
  text,
  text,
  text
)
to authenticated;
