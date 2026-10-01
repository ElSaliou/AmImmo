DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'short_rental_deposits_booking_id_key'
          AND conrelid = 'public.short_rental_deposits'::regclass
    ) THEN
        ALTER TABLE public.short_rental_deposits
        ADD CONSTRAINT short_rental_deposits_booking_id_key
        UNIQUE (booking_id);
    END IF;
END
$$;
