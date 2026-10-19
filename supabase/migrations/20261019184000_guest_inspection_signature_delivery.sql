-- ============================================================
-- F2.2C-8B1-A
-- GUEST COMMUNICATION DELIVERY FOUNDATION
--
-- Purpose:
-- - durable communication event history
-- - idempotence per inspection/version/event/channel
-- - server-side resolution of booking.guest_email
-- - internal guest notification
--
-- No email is sent by this migration.
-- ============================================================

begin;


-- ============================================================
-- 1. DURABLE DELIVERY TABLE
-- ============================================================

create table if not exists public.guest_communication_deliveries (

    id uuid primary key
        default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete cascade,

    guest_id uuid
        references public.guests(id)
        on delete set null,

    guest_user_id uuid,

    booking_id uuid not null
        references public.bookings(id)
        on delete cascade,

    inspection_id uuid not null
        references public.inspections(id)
        on delete cascade,

    inspection_version integer not null
        check (inspection_version >= 1),

    event text not null,

    channel public.notification_channel not null,

    recipient text,

    provider text,

    provider_reference text,

    status text not null
        default 'pending'
        check (
            status in (
                'pending',
                'sent',
                'failed',
                'skipped'
            )
        ),

    attempt_count integer not null
        default 0
        check (attempt_count >= 0),

    last_error text,

    sent_at timestamptz,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now()
);


-- ============================================================
-- 2. IDEMPOTENCE
--
-- One event may produce:
-- - one internal notification
-- - one email
-- - later one WhatsApp
-- - later one SMS
--
-- But never two deliveries for the same channel/version/event.
-- ============================================================

create unique index if not exists
    uq_guest_communication_delivery_event
on public.guest_communication_deliveries (
    inspection_id,
    inspection_version,
    event,
    channel
);


create unique index if not exists
    uq_guest_communication_delivery_provider_reference
on public.guest_communication_deliveries (
    provider,
    provider_reference
)
where
    provider is not null
    and provider_reference is not null;


create index if not exists
    idx_guest_communication_deliveries_booking
on public.guest_communication_deliveries (
    booking_id,
    created_at desc
);


create index if not exists
    idx_guest_communication_deliveries_guest
on public.guest_communication_deliveries (
    guest_id,
    created_at desc
);


-- ============================================================
-- 3. RLS
-- ============================================================

alter table public.guest_communication_deliveries
    enable row level security;


drop policy if exists
    "Staff read guest communication deliveries"
on public.guest_communication_deliveries;


create policy
    "Staff read guest communication deliveries"
on public.guest_communication_deliveries
for select
to authenticated
using (
    public.is_staff(auth.uid())
    and organization_id =
        public.current_org_id()
);


grant select
on public.guest_communication_deliveries
to authenticated;


grant all
on public.guest_communication_deliveries
to service_role;


revoke insert, update, delete
on public.guest_communication_deliveries
from anon, authenticated;


-- ============================================================
-- 4. PREPARE INSPECTION SIGNATURE DELIVERY
--
-- SECURITY RULE:
-- The caller supplies ONLY inspection_id.
--
-- Recipient is resolved exclusively:
--
-- inspection
--   -> booking
--   -> booking.guest_email
--
-- The browser never supplies the recipient.
-- ============================================================

create or replace function
public.prepare_guest_inspection_signature_delivery(
    p_inspection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$

declare

    v_user_id uuid;
    v_org_id uuid;

    v_inspection
        public.inspections%rowtype;

    v_booking
        public.bookings%rowtype;

    v_guest
        public.guests%rowtype;

    v_agency_signature
        public.inspection_signatures%rowtype;

    v_email_delivery
        public.guest_communication_deliveries%rowtype;

    v_internal_delivery_id uuid;

    v_recipient text;
    v_link text;

    v_title text;
    v_body text;

begin

    -- ========================================================
    -- AUTHORIZATION
    -- ========================================================

    v_user_id :=
        auth.uid();


    if v_user_id is null then

        raise exception
            'Authentication required.'
            using errcode = '42501';

    end if;


    if not public.is_staff(
        v_user_id
    ) then

        raise exception
            'Staff access required.'
            using errcode = '42501';

    end if;


    v_org_id :=
        public.current_org_id();


    if v_org_id is null then

        raise exception
            'Current organization not found.'
            using errcode = '42501';

    end if;


    -- ========================================================
    -- INSPECTION
    -- ========================================================

    select i.*
    into v_inspection

    from public.inspections i

    where
        i.id =
            p_inspection_id;


    if not found then

        raise exception
            'Inspection not found.'
            using errcode = 'P0001';

    end if;


    if v_inspection.organization_id
       is distinct from
       v_org_id
    then

        raise exception
            'Inspection belongs to another organization.'
            using errcode = '42501';

    end if;


    if v_inspection.booking_id is null then

        raise exception
            'This inspection is not attached to a short-rental booking.'
            using errcode = 'P0001';

    end if;


    if v_inspection.status
       <> 'ready_for_signature'::public.inspection_status
    then

        raise exception
            'Inspection is not open for signature.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- CURRENT AGENCY SIGNATURE
    -- ========================================================

    select s.*
    into v_agency_signature

    from public.inspection_signatures s

    where
        s.inspection_id =
            v_inspection.id

        and s.signer_role =
            'agency'::public.inspection_signer_role

        and s.accepted_version =
            v_inspection.version

    order by
        s.signed_at desc

    limit 1;


    if not found then

        raise exception
            'The agency has not signed the current inspection version.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- BOOKING SNAPSHOT
    -- ========================================================

    select b.*
    into v_booking

    from public.bookings b

    where
        b.id =
            v_inspection.booking_id;


    if not found then

        raise exception
            'Booking not found.'
            using errcode = 'P0001';

    end if;


    if v_booking.organization_id
       is distinct from
       v_inspection.organization_id
    then

        raise exception
            'Booking organization mismatch.'
            using errcode = 'P0001';

    end if;


    if v_booking.guest_id is null then

        raise exception
            'No guest is attached to this booking.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- AUTHORITATIVE EMAIL
    --
    -- IMPORTANT:
    -- guest profile email is NOT used here.
    -- ========================================================

    v_recipient :=
        lower(
            btrim(
                coalesce(
                    v_booking.guest_email,
                    ''
                )
            )
        );


    if
        v_recipient = ''
        or v_recipient !~
            '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    then

        raise exception
            'Booking guest email is missing or invalid.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- GUEST IDENTITY
    -- ========================================================

    select g.*
    into v_guest

    from public.guests g

    where
        g.id =
            v_booking.guest_id;


    if not found then

        raise exception
            'Guest not found.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- MESSAGE CONTENT
    -- ========================================================

    v_link :=
        '/guest/inspections/' ||
        v_inspection.id::text;


    if v_inspection.kind =
       'checkin'::public.inspection_kind
    then

        v_title :=
            'État des lieux d''entrée à signer';

        v_body :=
            'Votre état des lieux d''entrée est prêt. Consultez-le puis signez la version actuelle.';

    else

        v_title :=
            'État des lieux de sortie à signer';

        v_body :=
            'Votre état des lieux de sortie est prêt. Consultez-le puis signez la version actuelle.';

    end if;


    -- ========================================================
    -- INTERNAL NOTIFICATION
    --
    -- Only when the guest account is already linked.
    -- Idempotence is guaranteed by the delivery unique index.
    -- ========================================================

    if v_guest.user_id is not null then

        insert into
            public.guest_communication_deliveries (
                organization_id,
                guest_id,
                guest_user_id,
                booking_id,
                inspection_id,
                inspection_version,
                event,
                channel,
                recipient,
                provider,
                status,
                sent_at
            )

        values (
            v_inspection.organization_id,
            v_guest.id,
            v_guest.user_id,
            v_booking.id,
            v_inspection.id,
            v_inspection.version,
            'inspection_signature_required',
            'internal'::public.notification_channel,
            v_guest.user_id::text,
            'amimmo',
            'sent',
            now()
        )

        on conflict (
            inspection_id,
            inspection_version,
            event,
            channel
        )
        do nothing

        returning id
        into v_internal_delivery_id;


        if v_internal_delivery_id
           is not null
        then

            insert into public.notifications (
                user_id,
                channel,
                kind,
                title,
                body,
                link
            )
            values (
                v_guest.user_id,
                'internal'::public.notification_channel,
                'inspection_signature_required',
                v_title,
                v_body,
                v_link
            );

        end if;

    end if;


    -- ========================================================
    -- EMAIL DELIVERY
    -- ========================================================

    insert into
        public.guest_communication_deliveries (
            organization_id,
            guest_id,
            guest_user_id,
            booking_id,
            inspection_id,
            inspection_version,
            event,
            channel,
            recipient,
            provider,
            status
        )

    values (
        v_inspection.organization_id,
        v_guest.id,
        v_guest.user_id,
        v_booking.id,
        v_inspection.id,
        v_inspection.version,
        'inspection_signature_required',
        'email'::public.notification_channel,
        v_recipient,
        'resend',
        'pending'
    )

    on conflict (
        inspection_id,
        inspection_version,
        event,
        channel
    )
    do update

    set
        guest_id =
            case
                when public.guest_communication_deliveries.status = 'sent'
                    then public.guest_communication_deliveries.guest_id
                else excluded.guest_id
            end,

        guest_user_id =
            case
                when public.guest_communication_deliveries.status = 'sent'
                    then public.guest_communication_deliveries.guest_user_id
                else excluded.guest_user_id
            end,

        recipient =
            case
                when public.guest_communication_deliveries.status = 'sent'
                    then public.guest_communication_deliveries.recipient
                else excluded.recipient
            end,

        updated_at =
            now()

    returning *
    into v_email_delivery;


    -- ========================================================
    -- RESULT FOR EDGE FUNCTION
    -- ========================================================

    return jsonb_build_object(

        'delivery_id',
            v_email_delivery.id,

        'delivery_status',
            v_email_delivery.status,

        'inspection_id',
            v_inspection.id,

        'inspection_reference',
            v_inspection.reference,

        'inspection_kind',
            v_inspection.kind,

        'inspection_version',
            v_inspection.version,

        'booking_id',
            v_booking.id,

        'booking_reference',
            v_booking.reference,

        'guest_id',
            v_guest.id,

        'guest_user_id',
            v_guest.user_id,

        'guest_name',
            v_booking.guest_name,

        'recipient',
            v_email_delivery.recipient,

        'relative_link',
            v_link
    );

end;

$function$;


-- ============================================================
-- 5. MARK DELIVERY RESULT
-- ============================================================

create or replace function
public.mark_guest_communication_delivery(
    p_delivery_id uuid,
    p_succeeded boolean,
    p_provider_reference text default null,
    p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$

declare

    v_user_id uuid;
    v_org_id uuid;

    v_delivery
        public.guest_communication_deliveries%rowtype;

begin

    v_user_id :=
        auth.uid();


    if v_user_id is null
       or not public.is_staff(
            v_user_id
       )
    then

        raise exception
            'Staff access required.'
            using errcode = '42501';

    end if;


    v_org_id :=
        public.current_org_id();


    select d.*
    into v_delivery

    from public.guest_communication_deliveries d

    where
        d.id =
            p_delivery_id

    for update;


    if not found then

        raise exception
            'Delivery not found.'
            using errcode = 'P0001';

    end if;


    if v_delivery.organization_id
       is distinct from
       v_org_id
    then

        raise exception
            'Delivery belongs to another organization.'
            using errcode = '42501';

    end if;


    -- Already sent = immutable successful outcome.
    if v_delivery.status = 'sent' then

        return
            to_jsonb(v_delivery);

    end if;


    update
        public.guest_communication_deliveries

    set
        status =
            case
                when p_succeeded
                    then 'sent'
                else 'failed'
            end,

        provider_reference =
            case
                when p_succeeded
                then coalesce(
                    nullif(
                        btrim(
                            coalesce(
                                p_provider_reference,
                                ''
                            )
                        ),
                        ''
                    ),
                    provider_reference
                )
                else provider_reference
            end,

        attempt_count =
            attempt_count + 1,

        last_error =
            case
                when p_succeeded
                    then null
                else nullif(
                    btrim(
                        coalesce(
                            p_error_message,
                            ''
                        )
                    ),
                    ''
                )
            end,

        sent_at =
            case
                when p_succeeded
                    then coalesce(
                        sent_at,
                        now()
                    )
                else sent_at
            end,

        updated_at =
            now()

    where
        id =
            p_delivery_id

    returning *
    into v_delivery;


    return
        to_jsonb(v_delivery);

end;

$function$;


-- ============================================================
-- 6. FUNCTION PRIVILEGES
-- ============================================================

revoke all
on function
public.prepare_guest_inspection_signature_delivery(uuid)
from public, anon;


grant execute
on function
public.prepare_guest_inspection_signature_delivery(uuid)
to authenticated, service_role;


revoke all
on function
public.mark_guest_communication_delivery(
    uuid,
    boolean,
    text,
    text
)
from public, anon;


grant execute
on function
public.mark_guest_communication_delivery(
    uuid,
    boolean,
    text,
    text
)
to authenticated, service_role;


-- ============================================================
-- 7. DOCUMENTATION
-- ============================================================

comment on table
public.guest_communication_deliveries
is
'Durable and idempotent delivery history for guest communications.';


comment on function
public.prepare_guest_inspection_signature_delivery(uuid)
is
'Prepares the internal notification and email delivery after the agency has signed the current version of a short-rental inspection. The recipient email is resolved exclusively from bookings.guest_email.';


comment on function
public.mark_guest_communication_delivery(
    uuid,
    boolean,
    text,
    text
)
is
'Records the result of an external guest communication delivery.';


commit;