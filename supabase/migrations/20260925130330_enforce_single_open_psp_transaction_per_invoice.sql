-- ============================================================================
-- Prevent more than one open PSP transaction per invoice.
--
-- An open transaction is:
--   payment_id IS NULL
--   AND status IN ('pending', 'processing')
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_payment_provider_transactions_one_open_per_invoice
ON public.payment_provider_transactions (invoice_id)
WHERE
    payment_id IS NULL
    AND status IN ('pending', 'processing');