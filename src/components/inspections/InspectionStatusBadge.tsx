import { Badge } from "@/components/ui/badge";
import type { InspectionStatus } from "@/hooks/use-inspections";

type InspectionStatusBadgeProps = {
    status: InspectionStatus;
};

const STATUS_LABELS: Record<
    InspectionStatus,
    string
> = {
    draft: "Brouillon",
    ready_for_signature: "À signer",
    finalized: "Finalisé",
    cancelled: "Annulé",
};

const STATUS_CLASSES: Record<
    InspectionStatus,
    string
> = {
    draft:
        "border-slate-300 bg-slate-50 text-slate-700",
    ready_for_signature:
        "border-amber-300 bg-amber-50 text-amber-800",
    finalized:
        "border-emerald-300 bg-emerald-50 text-emerald-800",
    cancelled:
        "border-red-300 bg-red-50 text-red-700",
};

export function InspectionStatusBadge({
    status,
}: InspectionStatusBadgeProps) {
    return (
        <Badge
            variant="outline"
            className={STATUS_CLASSES[status]}
        >
            {STATUS_LABELS[status]}
        </Badge>
    );
}