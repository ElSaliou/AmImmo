/*
 * Guest and tenant portals intentionally share the same
 * inspection reader and signature engine.
 *
 * TenantInspectionPage derives the counterparty from
 * inspection.lease_id / inspection.booking_id and therefore
 * uses signer_role="guest" for short-rental inspections.
 *
 * Authorization remains enforced by get_inspection(),
 * can_read_inspection() and sign_inspection().
 */
export {
  default,
} from "@/pages/tenant/TenantInspectionPage";