import {
    useMemo,
    useState,
} from "react";

import {
    ClipboardCheck,
    Eye,
    Loader2,
    Search,
} from "lucide-react";

import {
    format,
    parseISO,
} from "date-fns";

import {
    fr,
} from "date-fns/locale";

import {
    useNavigate,
} from "react-router-dom";

import PageShell from "@/components/PageShell";

import {
    InspectionStatusBadge,
} from "@/components/inspections/InspectionStatusBadge";

import {
    type InspectionListItem,
    useInspectionList,
} from "@/hooks/use-inspection-list";

import type {
    InspectionKind,
    InspectionStatus,
} from "@/hooks/use-inspections";

import {
    Badge,
} from "@/components/ui/badge";

import {
    Button,
} from "@/components/ui/button";

import {
    Card,
    CardContent,
} from "@/components/ui/card";

import {
    Input,
} from "@/components/ui/input";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// ============================================================
// FILTER TYPES
// ============================================================

type KindFilter =
    | InspectionKind
    | "all";

type StatusFilter =
    | InspectionStatus
    | "all";

// ============================================================
// FORMATTERS
// ============================================================

const formatDateTime = (
    value:
        | string
        | null
        | undefined,
) => {
    if (!value) {
        return "—";
    }

    try {
        return format(
            parseISO(value),
            "dd MMM yyyy à HH:mm",
            {
                locale: fr,
            },
        );
    } catch {
        return value;
    }
};

const kindLabel = (
    kind: InspectionKind,
) =>
    kind === "checkin"
        ? "Entrée"
        : "Sortie";

const getPropertyLabel = (
    inspection: InspectionListItem,
) =>
    inspection.property?.title ||
    inspection.property?.reference ||
    "Bien immobilier";

const getPropertyLocation = (
    inspection: InspectionListItem,
) => {
    const parts = [
        inspection.property?.district,
        inspection.property?.commune,
        inspection.property?.city,
    ].filter(Boolean);

    return parts.length > 0
        ? parts.join(", ")
        : inspection.property?.address ||
              "—";
};

const getSourceType = (
    inspection: InspectionListItem,
) => {
    if (inspection.booking_id) {
        return "Réservation";
    }

    if (inspection.lease_id) {
        return "Bail";
    }

    return "—";
};

const getSourceReference = (
    inspection: InspectionListItem,
) => {
    if (inspection.booking_id) {
        return (
            inspection.booking?.reference ||
            inspection.booking_id
        );
    }

    if (inspection.lease_id) {
        return (
            inspection.lease?.reference ||
            inspection.lease_id
        );
    }

    return "—";
};

// ============================================================
// PAGE
// ============================================================

export default function InspectionsPage() {
    const navigate =
        useNavigate();

    const inspections =
        useInspectionList();

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        kindFilter,
        setKindFilter,
    ] =
        useState<KindFilter>(
            "all",
        );

    const [
        statusFilter,
        setStatusFilter,
    ] =
        useState<StatusFilter>(
            "all",
        );

    const rows =
        inspections.data ?? [];

    const filteredRows =
        useMemo(
            () => {
                const normalizedSearch =
                    search
                        .trim()
                        .toLocaleLowerCase(
                            "fr",
                        );

                return rows.filter(
                    (inspection) => {
                        if (
                            kindFilter !==
                                "all" &&
                            inspection.kind !==
                                kindFilter
                        ) {
                            return false;
                        }

                        if (
                            statusFilter !==
                                "all" &&
                            inspection.status !==
                                statusFilter
                        ) {
                            return false;
                        }

                        if (
                            !normalizedSearch
                        ) {
                            return true;
                        }

                        const searchable =
                            [
                                inspection.reference,
                                inspection.property
                                    ?.title,
                                inspection.property
                                    ?.reference,
                                inspection.property
                                    ?.address,
                                inspection.property
                                    ?.district,
                                inspection.property
                                    ?.commune,
                                inspection.property
                                    ?.city,
                                inspection.booking
                                    ?.reference,
                                inspection.booking
                                    ?.guest_name,
                                inspection.lease
                                    ?.reference,
                            ]
                                .filter(Boolean)
                                .join(" ")
                                .toLocaleLowerCase(
                                    "fr",
                                );

                        return searchable.includes(
                            normalizedSearch,
                        );
                    },
                );
            },
            [
                rows,
                search,
                kindFilter,
                statusFilter,
            ],
        );

    const draftCount =
        rows.filter(
            (item) =>
                item.status ===
                "draft",
        ).length;

    const signatureCount =
        rows.filter(
            (item) =>
                item.status ===
                "ready_for_signature",
        ).length;

    const finalizedCount =
        rows.filter(
            (item) =>
                item.status ===
                "finalized",
        ).length;

    return (
        <PageShell
            title="États des lieux"
            subtitle="Gérez les états des lieux d'entrée et de sortie liés aux baux et aux réservations."
        >
            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">
                                Total
                            </p>

                            <p className="mt-1 text-2xl font-semibold">
                                {rows.length}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">
                                Brouillons
                            </p>

                            <p className="mt-1 text-2xl font-semibold">
                                {draftCount}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">
                                À signer
                            </p>

                            <p className="mt-1 text-2xl font-semibold">
                                {signatureCount}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <p className="text-sm text-muted-foreground">
                                Finalisés
                            </p>

                            <p className="mt-1 text-2xl font-semibold">
                                {finalizedCount}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="p-5">
                        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                <Input
                                    value={
                                        search
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setSearch(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="Rechercher une référence, un bien, une réservation..."
                                    className="pl-9"
                                />
                            </div>

                            <Select
                                value={
                                    kindFilter
                                }
                                onValueChange={(
                                    value,
                                ) =>
                                    setKindFilter(
                                        value as KindFilter,
                                    )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="all">
                                        Tous les types
                                    </SelectItem>

                                    <SelectItem value="checkin">
                                        Entrée
                                    </SelectItem>

                                    <SelectItem value="checkout">
                                        Sortie
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={
                                    statusFilter
                                }
                                onValueChange={(
                                    value,
                                ) =>
                                    setStatusFilter(
                                        value as StatusFilter,
                                    )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="all">
                                        Tous les statuts
                                    </SelectItem>

                                    <SelectItem value="draft">
                                        Brouillon
                                    </SelectItem>

                                    <SelectItem value="ready_for_signature">
                                        À signer
                                    </SelectItem>

                                    <SelectItem value="finalized">
                                        Finalisé
                                    </SelectItem>

                                    <SelectItem value="cancelled">
                                        Annulé
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        {inspections.isLoading ? (
                            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />

                                Chargement des états des lieux...
                            </div>
                        ) : inspections.isError ? (
                            <div className="p-6">
                                <p className="font-medium text-destructive">
                                    Impossible de charger les états des lieux.
                                </p>

                                <p className="mt-2 text-sm text-muted-foreground">
                                    {inspections.error instanceof
                                    Error
                                        ? inspections
                                              .error
                                              .message
                                        : "Une erreur est survenue."}
                                </p>
                            </div>
                        ) : filteredRows.length ===
                          0 ? (
                            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                                <ClipboardCheck className="h-10 w-10 text-muted-foreground/60" />

                                <h2 className="mt-4 font-semibold">
                                    Aucun état des lieux
                                </h2>

                                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                    Aucun état des lieux ne correspond aux critères actuels.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                Référence
                                            </TableHead>

                                            <TableHead>
                                                Type
                                            </TableHead>

                                            <TableHead>
                                                Source
                                            </TableHead>

                                            <TableHead>
                                                Bien
                                            </TableHead>

                                            <TableHead>
                                                Date
                                            </TableHead>

                                            <TableHead>
                                                Statut
                                            </TableHead>

                                            <TableHead className="w-[90px] text-right">
                                                Action
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {filteredRows.map(
                                            (
                                                inspection,
                                            ) => (
                                                <TableRow
                                                    key={
                                                        inspection.id
                                                    }
                                                >
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {inspection.reference ||
                                                                `EDL-${inspection.id
                                                                    .slice(
                                                                        0,
                                                                        8,
                                                                    )
                                                                    .toUpperCase()}`}
                                                        </div>

                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Version{" "}
                                                            {
                                                                inspection.version
                                                            }
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                        >
                                                            {kindLabel(
                                                                inspection.kind,
                                                            )}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {getSourceType(
                                                                inspection,
                                                            )}
                                                        </div>

                                                        <div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">
                                                            {getSourceReference(
                                                                inspection,
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {getPropertyLabel(
                                                                inspection,
                                                            )}
                                                        </div>

                                                        <div className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">
                                                            {getPropertyLocation(
                                                                inspection,
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="whitespace-nowrap">
                                                        {formatDateTime(
                                                            inspection.performed_at,
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <InspectionStatusBadge
                                                            status={
                                                                inspection.status
                                                            }
                                                        />
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/admin/inspections/${inspection.id}`,
                                                                )
                                                            }
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />

                                                            Voir
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageShell>
    );
}