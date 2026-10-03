-- ============================================================
-- OWNER STATEMENT DELIVERY HISTORY
-- Conserve chaque transmission d'un relevé propriétaire.
-- owner_statements.sent_at reste la date du PREMIER envoi.
-- ============================================================

create table if not exists public.owner_statement_deliveries (
  id uuid primary key default gen_random_uuid(),

  statement_id uuid not null
    references public.owner_statements(id)
    on delete cascade,

  channel text not null
    check (
      channel in (
        'email',
        'whatsapp',
        'manual'
      )
    ),

  sent_to text not null
    check (
      nullif(btrim(sent_to), '') is not null
    ),

  provider text,

  provider_reference text,

  status text not null default 'sent'
    check (
      status in (
        'sent',
        'delivered',
        'failed',
        'bounced'
      )
    ),

  error_message text,

  sent_by uuid
    references auth.users(id)
    on delete set null,

  sent_at timestamptz not null
    default now(),

  created_at timestamptz not null
    default now()
);


-- ============================================================
-- INDEX
-- ============================================================

create index if not exists
  idx_owner_statement_deliveries_statement_sent_at
on public.owner_statement_deliveries (
  statement_id,
  sent_at desc
);


-- ============================================================
-- RLS
-- ============================================================

alter table public.owner_statement_deliveries
  enable row level security;


drop policy if exists
  "Staff can read owner statement deliveries"
on public.owner_statement_deliveries;


create policy
  "Staff can read owner statement deliveries"
on public.owner_statement_deliveries
for select
to authenticated
using (
  public.is_staff(auth.uid())
);


grant select
on public.owner_statement_deliveries
to authenticated;


-- Les écritures passent par la fonction SECURITY DEFINER.
revoke insert, update, delete
on public.owner_statement_deliveries
from anon, authenticated;


-- ============================================================
-- MARK STATEMENT SENT + DELIVERY HISTORY
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
    raise exception 'Le relevé est obligatoire';
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
    raise exception 'Relevé introuvable';
  end if;

  if v_statement.status = 'cancelled' then
    raise exception 'Un relevé annulé ne peut pas être envoyé';
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

  -- ----------------------------------------------------------
  -- État synthétique du relevé
  -- sent_at = date du PREMIER envoi uniquement.
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- Historique immuable de CET envoi
  -- ----------------------------------------------------------

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
  );

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
