-- ============================================================
-- F2.2C-8B2-A
-- BOOKING CONFIRMATION EMAIL DELIVERY
--
-- Extends guest_communication_deliveries so it can support:
-- - inspection-level communication events
-- - booking-level communication events
--
-- Booking confirmation email:
-- booking
--   -> booking.guest_email
--   -> payment access
--   -> Resend
--
-- The browser never supplies the recipient.
-- ============================================================

begin;


-- ============================================================
-- 1. GENERALIZE DELIVERY SCOPE
--
-- Existing inspection deliveries keep:
--   inspection_id + inspection_version
--
-- Booking-level deliveries use:
--   inspection_id = null
--   inspection_version = null
-- ============================================================

alter table public.guest_communication_deliveries
    alter column inspection_id
        drop not null;

alter table public.guest_communication_deliveries
    alter column inspection_version
        drop not null;


alter table public.guest_communication_deliveries
    drop constraint if exists
        guest_communication_deliveries_inspection_version_check;

alter table public.guest_communication_deliveries
    add constraint
        guest_communication_deliveries_inspection_version_check
    check (
        inspection_version is null
        or inspection_version >= 1
    );


alter table public.guest_communication_deliveries
    drop constraint if exists
        guest_communication_deliveries_scope_check;

alter table public.guest_communication_deliveries
    add constraint
        guest_communication_deliveries_scope_check
    check (
        (
            inspection_id is null
            and inspection_version is null
        )
        or
        (
            inspection_id is not null
            and inspection_version is not null
        )
    );


-- ============================================================
-- 2. DELIVERY ATTEMPT STATE
--
-- "sending" prevents two simultaneous confirmation-email
-- attempts from rotating each other's payment token.
-- ============================================================

alter table public.guest_communication_deliveries
    add column if not exists
        attempt_started_at timestamptz;


alter table public.guest_communication_deliveries
    drop constraint if exists
        guest_communication_deliveries_status_check;

alter table public.guest_communication_deliveries
    add constraint
        guest_communication_deliveries_status_check
    check (
        status in (
            'pending',
            'sending',
            'sent',
            'failed',
            'skipped'
        )
    );


-- ============================================================
-- 3. BOOKING-LEVEL IDEMPOTENCE
--
-- Only one durable delivery per:
-- booking / event / channel
--
-- Inspection deliveries remain protected by the existing
-- inspection/version/event/channel unique index.
-- ============================================================

create unique index if not exists
    uq_guest_communication_delivery_booking_event
on public.guest_communication_deliveries (
    booking_id,
    event,
    channel
)
where
    inspection_id is null;


-- ============================================================
-- 4. PREPARE BOOKING CONFIRMATION DELIVERY
--
-- SECURITY:
-- caller supplies booking_id only.
--
-- Recipient is always resolved server-side from:
-- bookings.guest_email
-- ============================================================

create or replace function
public.prepare_guest_booking_confirmation_delivery(
    p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$

declare

    v_user_id uuid;
    v_org_id uuid;

    v_booking
        public.bookings%rowtype;

    v_guest
        public.guests%rowtype;

    v_invoice
        public.invoices%rowtype;

    v_email_delivery
        public.guest_communication_deliveries%rowtype;

    v_internal_delivery_id uuid;

    v_recipient text;

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


    if p_booking_id is null then

        raise exception
            'Booking id is required.'
            using errcode = '22023';

    end if;


    -- ========================================================
    -- BOOKING
    -- ========================================================

    select b.*
    into v_booking

    from public.bookings b

    where
        b.id =
            p_booking_id;


    if not found then

        raise exception
            'Booking not found.'
            using errcode = 'P0002';

    end if;


    if v_booking.organization_id
       is distinct from
       v_org_id
    then

        raise exception
            'Booking belongs to another organization.'
            using errcode = '42501';

    end if;


    if v_booking.status not in (
        'confirmed'::public.booking_status,
        'in_progress'::public.booking_status
    )
    then

        raise exception
            'Booking is not confirmed.'
            using errcode = 'P0001';

    end if;


    if v_booking.confirmed_at is null then

        raise exception
            'Booking confirmation timestamp is missing.'
            using errcode = 'P0001';

    end if;


    if v_booking.guest_id is null then

        raise exception
            'No guest is attached to this booking.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- AUTHORITATIVE EMAIL
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
            using errcode = 'P0002';

    end if;


    if v_guest.organization_id
       is distinct from
       v_booking.organization_id
    then

        raise exception
            'Guest organization mismatch.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- ACTIVE INVOICE
    --
    -- confirm_short_rental_booking() creates this
    -- automatically before this function is called.
    -- ========================================================

    select i.*
    into v_invoice

    from public.invoices i

    where
        i.booking_id =
            v_booking.id

        and i.kind =
            'booking'::public.invoice_kind

        and i.status <>
            'cancelled'::public.invoice_status

    order by
        i.created_at desc

    limit 1;


    if not found then

        raise exception
            'Active booking invoice not found.'
            using errcode = 'P0001';

    end if;


    -- ========================================================
    -- INTERNAL NOTIFICATION
    --
    -- Only for an already-linked guest.
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
            v_booking.organization_id,
            v_guest.id,
            v_guest.user_id,
            v_booking.id,
            null,
            null,
            'booking_confirmed',
            'internal'::public.notification_channel,
            v_guest.user_id::text,
            'amimmo',
            'sent',
            now()
        )

        on conflict (
            booking_id,
            event,
            channel
        )
        where inspection_id is null

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
                'booking_confirmed',
                'Réservation confirmée',
                'Votre réservation ' ||
                    v_booking.reference ||
                    ' a été confirmée par l''agence.',
                '/guest'
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
        v_booking.organization_id,
        v_guest.id,
        v_guest.user_id,
        v_booking.id,
        null,
        null,
        'booking_confirmed',
        'email'::public.notification_channel,
        v_recipient,
        'resend',
        'pending'
    )

    on conflict (
        booking_id,
        event,
        channel
    )
    where inspection_id is null

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
    -- RESULT
    -- ========================================================

    return jsonb_build_object(

        'delivery_id',
            v_email_delivery.id,

        'delivery_status',
            v_email_delivery.status,

        'attempt_count',
            v_email_delivery.attempt_count,

        'booking_id',
            v_booking.id,

        'booking_reference',
            v_booking.reference,

        'booking_status',
            v_booking.status,

        'guest_id',
            v_guest.id,

        'guest_user_id',
            v_guest.user_id,

        'guest_name',
            v_booking.guest_name,

        'recipient',
            v_email_delivery.recipient,

        'check_in',
            v_booking.check_in,

        'check_out',
            v_booking.check_out,

        'payment_plan',
            v_booking.payment_plan,

        'initial_payment_percent',
            v_booking.initial_payment_percent,

        'payment_due_at',
            v_booking.payment_due_at,

        'payment_policy_text',
            v_booking.payment_policy_text,

        'cancellation_policy_text',
            v_booking.cancellation_policy_text,

        'total_amount',
            v_booking.total_amount,

        'deposit',
            v_booking.deposit,

        'currency',
            v_booking.currency,

        'invoice_id',
            v_invoice.id,

        'invoice_number',
            v_invoice.number,

        'invoice_status',
            v_invoice.status
    );

end;

$function$;


-- ============================================================
-- 5. ATOMICALLY CLAIM AN EMAIL ATTEMPT
--
-- Prevents simultaneous calls from rotating the payment token
-- underneath each other.
--
-- A "sending" attempt becomes retryable after 2 minutes.
-- ============================================================

create or replace function
public.begin_guest_booking_confirmation_delivery_attempt(
    p_delivery_id uuid
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
            using errcode = 'P0002';

    end if;


    if v_delivery.organization_id
       is distinct from
       v_org_id
    then

        raise exception
            'Delivery belongs to another organization.'
            using errcode = '42501';

    end if;


    if
        v_delivery.inspection_id is not null
        or v_delivery.event <> 'booking_confirmed'
        or v_delivery.channel <> 'email'::public.notification_channel
    then

        raise exception
            'Delivery is not a booking confirmation email.'
            using errcode = 'P0001';

    end if;


    if v_delivery.status = 'sent' then

        return jsonb_build_object(
            'delivery_id',
                v_delivery.id,
            'should_send',
                false,
            'already_sent',
                true,
            'in_progress',
                false,
            'attempt_no',
                v_delivery.attempt_count
        );

    end if;


    if
        v_delivery.status = 'sending'
        and v_delivery.attempt_started_at is not null
        and v_delivery.attempt_started_at >
            now() - interval '2 minutes'
    then

        return jsonb_build_object(
            'delivery_id',
                v_delivery.id,
            'should_send',
                false,
            'already_sent',
                false,
            'in_progress',
                true,
            'attempt_no',
                v_delivery.attempt_count
        );

    end if;


    update public.guest_communication_deliveries

    set
        status =
            'sending',

        attempt_count =
            attempt_count + 1,

        attempt_started_at =
            now(),

        last_error =
            null,

        updated_at =
            now()

    where
        id =
            v_delivery.id

    returning *
    into v_delivery;


    return jsonb_build_object(
        'delivery_id',
            v_delivery.id,
        'should_send',
            true,
        'already_sent',
            false,
        'in_progress',
            false,
        'attempt_no',
            v_delivery.attempt_count
    );

end;

$function$;


-- ============================================================
-- 6. COMPLETE ATTEMPT
--
-- attempt_count is incremented when the attempt is claimed,
-- not here.
-- ============================================================

create or replace function
public.finish_guest_booking_confirmation_delivery_attempt(
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
            using errcode = 'P0002';

    end if;


    if v_delivery.organization_id
       is distinct from
       v_org_id
    then

        raise exception
            'Delivery belongs to another organization.'
            using errcode = '42501';

    end if;


    if
        v_delivery.inspection_id is not null
        or v_delivery.event <> 'booking_confirmed'
        or v_delivery.channel <> 'email'::public.notification_channel
    then

        raise exception
            'Delivery is not a booking confirmation email.'
            using errcode = 'P0001';

    end if;


    if v_delivery.status = 'sent' then

        return
            to_jsonb(
                v_delivery
            );

    end if;


    update public.guest_communication_deliveries

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

        attempt_started_at =
            null,

        updated_at =
            now()

    where
        id =
            v_delivery.id

    returning *
    into v_delivery;


    return
        to_jsonb(
            v_delivery
        );

end;

$function$;


-- ============================================================
-- 7. PRIVILEGES
-- ============================================================

revoke all
on function
public.prepare_guest_booking_confirmation_delivery(uuid)
from public, anon;

grant execute
on function
public.prepare_guest_booking_confirmation_delivery(uuid)
to authenticated, service_role;


revoke all
on function
public.begin_guest_booking_confirmation_delivery_attempt(uuid)
from public, anon;

grant execute
on function
public.begin_guest_booking_confirmation_delivery_attempt(uuid)
to authenticated, service_role;


revoke all
on function
public.finish_guest_booking_confirmation_delivery_attempt(
    uuid,
    boolean,
    text,
    text
)
from public, anon;

grant execute
on function
public.finish_guest_booking_confirmation_delivery_attempt(
    uuid,
    boolean,
    text,
    text
)
to authenticated, service_role;


-- ============================================================
-- 8. DOCUMENTATION
-- ============================================================

comment on function
public.prepare_guest_booking_confirmation_delivery(uuid)
is
'Prepares one durable booking-confirmation communication event and resolves the authoritative recipient from bookings.guest_email.';


comment on function
public.begin_guest_booking_confirmation_delivery_attempt(uuid)
is
'Atomically claims a booking confirmation email attempt and prevents concurrent payment-link rotation.';


comment on function
public.finish_guest_booking_confirmation_delivery_attempt(
    uuid,
    boolean,
    text,
    text
)
is
'Marks a claimed booking confirmation email attempt as sent or failed without altering the booking confirmation itself.';


commit;