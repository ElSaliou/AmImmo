import {
    useMemo,
    useState,
    type FormEvent,
} from "react";

import {
    AlertTriangle,
    CheckCircle2,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    useAddInspectionFinding,
    useUpdateInspectionFinding,
    useDeleteInspectionFinding,
} from "@/hooks/use-inspections";

import type {
    InspectionFindingSnapshot,
    InspectionRoomSnapshot,
    InspectionStatus,
} from "@/hooks/use-inspections";

type InspectionFindingEditorProps = {
    inspectionId: string;
    status: InspectionStatus;
    findings: InspectionFindingSnapshot[];
    rooms: InspectionRoomSnapshot[];
};

type FindingFormState = {
    title: string;
    description: string;
    severity: string;
    estimatedCost: string;
    roomId: string;
    itemId: string;
    resolved: boolean;
};

const NONE_VALUE = "__none__";

const EMPTY_FORM: FindingFormState = {
    title: "",
    description: "",
    severity: "moderate",
    estimatedCost: "",
    roomId: NONE_VALUE,
    itemId: NONE_VALUE,
    resolved: false,
};

const SEVERITY_OPTIONS = [
    {
        value: "minor",
        label: "Faible",
    },
    {
        value: "moderate",
        label: "Moyenne",
    },
    {
        value: "major",
        label: "Élevée",
    },
    {
        value: "critical",
        label: "Critique",
    },
];

const SEVERITY_LABELS = Object.fromEntries(
    SEVERITY_OPTIONS.map(
        (option) => [
            option.value,
            option.label,
        ],
    ),
) as Record<string, string>;

const getErrorMessage = (
    error: unknown,
) =>
    error instanceof Error
        ? error.message
        : "Une erreur est survenue.";

const parseEstimatedCost = (
    value: string,
) => {
    if (!value.trim()) {
        return null;
    }

    const parsed =
        Number(value);

    if (
        !Number.isFinite(parsed) ||
        parsed < 0
    ) {
        return undefined;
    }

    return parsed;
};

const findItemRoomId = (
    rooms: InspectionRoomSnapshot[],
    itemId: string | null,
) => {
    if (!itemId) {
        return null;
    }

    const room = rooms.find(
        (candidate) =>
            candidate.items.some(
                (item) =>
                    item.id === itemId,
            ),
    );

    return room?.id ?? null;
};

const getFormFromFinding = (
    finding: InspectionFindingSnapshot,
    rooms: InspectionRoomSnapshot[],
): FindingFormState => {
    const inferredRoomId =
        finding.room_id ??
        findItemRoomId(
            rooms,
            finding.item_id,
        );

    return {
        title:
            finding.title ?? "",

        description:
            finding.description ?? "",

        severity:
            finding.severity ||
            "moderate",

        estimatedCost:
            finding.estimated_cost === null
                ? ""
                : String(
                      finding.estimated_cost,
                  ),

        roomId:
            inferredRoomId ??
            NONE_VALUE,

        itemId:
            finding.item_id ??
            NONE_VALUE,

        resolved:
            finding.resolved ?? false,
    };
};

type FindingFormProps = {
    form: FindingFormState;
    rooms: InspectionRoomSnapshot[];
    onChange: (
        value: FindingFormState,
    ) => void;
    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
    onCancel: () => void;
    submitting: boolean;
    submitLabel: string;
    allowResolved: boolean;
    allowLocationEdit: boolean;
};

function FindingForm({
    form,
    rooms,
    onChange,
    onSubmit,
    onCancel,
    submitting,
    submitLabel,
    allowResolved,
    allowLocationEdit,
}: FindingFormProps) {
    const estimatedCost =
        parseEstimatedCost(
            form.estimatedCost,
        );

    const selectedRoom =
        form.roomId === NONE_VALUE
            ? null
            : rooms.find(
                  (room) =>
                      room.id === form.roomId,
              ) ?? null;

    const availableItems =
        selectedRoom?.items ?? [];

    return (
        <form
            className="space-y-4 rounded-lg border bg-muted/20 p-4"
            onSubmit={onSubmit}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="inspection-finding-title">
                        Intitulé
                    </Label>

                    <Input
                        id="inspection-finding-title"
                        value={form.title}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                title:
                                    event.target.value,
                            })
                        }
                        placeholder="Ex. Fissure sur le mur"
                        disabled={submitting}
                    />
                </div>

                <div className="space-y-2">
                    <Label>
                        Gravité
                    </Label>

                    <Select
                        value={form.severity}
                        onValueChange={(value) =>
                            onChange({
                                ...form,
                                severity:
                                    value,
                            })
                        }
                        disabled={submitting}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            {SEVERITY_OPTIONS.map(
                                (option) => (
                                    <SelectItem
                                        key={
                                            option.value
                                        }
                                        value={
                                            option.value
                                        }
                                    >
                                        {
                                            option.label
                                        }
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>
                        Pièce concernée
                    </Label>

                    <Select
                        value={form.roomId}
                        onValueChange={(value) =>
                            onChange({
                                ...form,
                                roomId:
                                    value,
                                itemId:
                                    NONE_VALUE,
                            })
                        }
                        disabled={
                            submitting ||
                            !allowLocationEdit
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem
                                value={
                                    NONE_VALUE
                                }
                            >
                                Constat général
                            </SelectItem>

                            {rooms.map(
                                (room) => (
                                    <SelectItem
                                        key={
                                            room.id
                                        }
                                        value={
                                            room.id
                                        }
                                    >
                                        {
                                            room.name
                                        }
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>
                        Élément concerné
                    </Label>

                    <Select
                        value={form.itemId}
                        onValueChange={(value) =>
                            onChange({
                                ...form,
                                itemId:
                                    value,
                            })
                        }
                        disabled={
                            submitting ||
                            !allowLocationEdit ||
                            !selectedRoom
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem
                                value={
                                    NONE_VALUE
                                }
                            >
                                Aucun élément précis
                            </SelectItem>

                            {availableItems.map(
                                (item) => (
                                    <SelectItem
                                        key={
                                            item.id
                                        }
                                        value={
                                            item.id
                                        }
                                    >
                                        {
                                            item.name
                                        }
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {!allowLocationEdit && (
                <p className="text-xs text-muted-foreground">
                    La pièce et l’élément associés ne peuvent
                    pas être changés après la création du constat.
                    Pour modifier cette association, supprimez puis
                    recréez le constat.
                </p>
            )}

            <div className="space-y-2">
                <Label htmlFor="inspection-finding-description">
                    Description
                </Label>

                <Textarea
                    id="inspection-finding-description"
                    value={form.description}
                    onChange={(event) =>
                        onChange({
                            ...form,
                            description:
                                event.target.value,
                        })
                    }
                    placeholder="Décrivez précisément le constat..."
                    rows={4}
                    disabled={submitting}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="inspection-finding-cost">
                        Coût estimé
                    </Label>

                    <Input
                        id="inspection-finding-cost"
                        type="number"
                        min={0}
                        step="any"
                        value={form.estimatedCost}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                estimatedCost:
                                    event.target.value,
                            })
                        }
                        placeholder="Optionnel"
                        disabled={submitting}
                    />

                    {estimatedCost ===
                        undefined && (
                        <p className="text-sm text-destructive">
                            Le coût doit être positif ou nul.
                        </p>
                    )}
                </div>

                {allowResolved && (
                    <div className="flex items-end">
                        <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md border px-4 py-2 text-sm">
                            <input
                                type="checkbox"
                                checked={
                                    form.resolved
                                }
                                onChange={(event) =>
                                    onChange({
                                        ...form,
                                        resolved:
                                            event
                                                .target
                                                .checked,
                                    })
                                }
                                disabled={
                                    submitting
                                }
                            />

                            Constat résolu
                        </label>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Annuler
                </Button>

                <Button
                    type="submit"
                    disabled={
                        submitting ||
                        !form.title.trim() ||
                        estimatedCost ===
                            undefined
                    }
                >
                    {submitting
                        ? "Enregistrement..."
                        : submitLabel}
                </Button>
            </div>
        </form>
    );
}

export function InspectionFindingEditor({
    inspectionId,
    status,
    findings,
    rooms,
}: InspectionFindingEditorProps) {
    const canEdit =
        status === "draft";

    const addFinding =
        useAddInspectionFinding();

    const updateFinding =
        useUpdateInspectionFinding();

    const deleteFinding =
        useDeleteInspectionFinding();

    const [
        showAddForm,
        setShowAddForm,
    ] = useState(false);

    const [
        addForm,
        setAddForm,
    ] = useState<FindingFormState>(
        EMPTY_FORM,
    );

    const [
        editingFindingId,
        setEditingFindingId,
    ] = useState<string | null>(
        null,
    );

    const [
        editForm,
        setEditForm,
    ] = useState<FindingFormState>(
        EMPTY_FORM,
    );

    const [
        actionError,
        setActionError,
    ] = useState<string | null>(
        null,
    );

    const itemLookup =
        useMemo(
            () =>
                new Map(
                    rooms.flatMap(
                        (room) =>
                            room.items.map(
                                (item) => [
                                    item.id,
                                    {
                                        roomName:
                                            room.name,
                                        itemName:
                                            item.name,
                                    },
                                ] as const,
                            ),
                    ),
                ),
            [rooms],
        );

    const roomLookup =
        useMemo(
            () =>
                new Map(
                    rooms.map(
                        (room) => [
                            room.id,
                            room.name,
                        ],
                    ),
                ),
            [rooms],
        );

    const busy =
        addFinding.isPending ||
        updateFinding.isPending ||
        deleteFinding.isPending;

    const handleAdd = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        const estimatedCost =
            parseEstimatedCost(
                addForm.estimatedCost,
            );

        if (
            !canEdit ||
            !addForm.title.trim() ||
            estimatedCost === undefined
        ) {
            return;
        }

        const roomId =
            addForm.roomId ===
            NONE_VALUE
                ? undefined
                : addForm.roomId;

        const itemId =
            addForm.itemId ===
            NONE_VALUE
                ? undefined
                : addForm.itemId;

        setActionError(null);

        try {
            await addFinding.mutateAsync({
                p_inspection_id:
                    inspectionId,

                p_title:
                    addForm.title.trim(),

                p_description:
                    addForm.description.trim(),

                p_severity:
                    addForm.severity.trim(),

                p_estimated_cost:
                    estimatedCost ??
                    undefined,

                p_room_id:
                    roomId,

                p_item_id:
                    itemId,
            });

            setAddForm(
                EMPTY_FORM,
            );

            setShowAddForm(
                false,
            );
        } catch (error) {
            setActionError(
                getErrorMessage(error),
            );
        }
    };

    const startEdit = (
        finding: InspectionFindingSnapshot,
    ) => {
        if (!canEdit) {
            return;
        }

        setActionError(null);

        setEditingFindingId(
            finding.id,
        );

        setEditForm(
            getFormFromFinding(
                finding,
                rooms,
            ),
        );

        setShowAddForm(
            false,
        );
    };

    const handleUpdate = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        const estimatedCost =
            parseEstimatedCost(
                editForm.estimatedCost,
            );

        if (
            !canEdit ||
            !editingFindingId ||
            !editForm.title.trim() ||
            estimatedCost === undefined
        ) {
            return;
        }

        setActionError(null);

        try {
            await updateFinding.mutateAsync({
                p_finding_id:
                    editingFindingId,

                p_title:
                    editForm.title.trim(),

                p_description:
                    editForm.description.trim(),

                p_severity:
                    editForm.severity.trim(),

                p_estimated_cost:
                    estimatedCost ??
                    undefined,

                p_clear_estimated_cost:
                    estimatedCost === null,

                p_resolved:
                    editForm.resolved,
            });

            setEditingFindingId(
                null,
            );

            setEditForm(
                EMPTY_FORM,
            );
        } catch (error) {
            setActionError(
                getErrorMessage(error),
            );
        }
    };

    const handleDelete = async (
        finding: InspectionFindingSnapshot,
    ) => {
        if (
            !canEdit ||
            busy
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                `Supprimer le constat « ${finding.title} » ?`,
            );

        if (!confirmed) {
            return;
        }

        setActionError(null);

        try {
            await deleteFinding.mutateAsync({
                p_finding_id:
                    finding.id,
            });

            if (
                editingFindingId ===
                finding.id
            ) {
                setEditingFindingId(
                    null,
                );
            }
        } catch (error) {
            setActionError(
                getErrorMessage(error),
            );
        }
    };

    const getLocationLabel = (
        finding: InspectionFindingSnapshot,
    ) => {
        if (finding.item_id) {
            const item =
                itemLookup.get(
                    finding.item_id,
                );

            if (item) {
                return `${item.roomName} · ${item.itemName}`;
            }
        }

        if (finding.room_id) {
            return (
                roomLookup.get(
                    finding.room_id,
                ) ??
                "Pièce liée"
            );
        }

        return "Constat général";
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        Anomalies / constats
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        {findings.length === 0
                            ? "Aucun constat enregistré."
                            : `${findings.length} constat${
                                  findings.length > 1
                                      ? "s"
                                      : ""
                              } enregistré${
                                  findings.length > 1
                                      ? "s"
                                      : ""
                              }.`}
                    </p>
                </div>

                {canEdit && (
                    <Button
                        type="button"
                        onClick={() => {
                            setActionError(null);

                            setEditingFindingId(
                                null,
                            );

                            setShowAddForm(
                                (current) =>
                                    !current,
                            );
                        }}
                        disabled={busy}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un constat
                    </Button>
                )}
            </div>

            {!canEdit && (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Les constats sont en lecture seule car
                    cet état des lieux n’est plus en
                    brouillon.
                </div>
            )}

            {actionError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {actionError}
                </div>
            )}

            {canEdit &&
                showAddForm && (
                    <FindingForm
                        form={addForm}
                        rooms={rooms}
                        onChange={
                            setAddForm
                        }
                        onSubmit={
                            handleAdd
                        }
                        onCancel={() => {
                            setShowAddForm(
                                false,
                            );

                            setAddForm(
                                EMPTY_FORM,
                            );
                        }}
                        submitting={
                            addFinding.isPending
                        }
                        submitLabel="Ajouter le constat"
                        allowResolved={
                            false
                        }
                        allowLocationEdit={
                            true
                        }
                    />
                )}

            {findings.length === 0 &&
            !showAddForm ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />

                    <p className="mt-3 font-medium">
                        Aucun constat
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {canEdit
                            ? "Ajoutez ici les anomalies, dégradations ou réserves constatées."
                            : "Aucune anomalie n’a été enregistrée."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {findings.map(
                        (finding) => (
                            <div
                                key={
                                    finding.id
                                }
                                className="rounded-lg border bg-card p-4"
                            >
                                {editingFindingId ===
                                finding.id ? (
                                    <FindingForm
                                        form={
                                            editForm
                                        }
                                        rooms={
                                            rooms
                                        }
                                        onChange={
                                            setEditForm
                                        }
                                        onSubmit={
                                            handleUpdate
                                        }
                                        onCancel={() => {
                                            setEditingFindingId(
                                                null,
                                            );

                                            setEditForm(
                                                EMPTY_FORM,
                                            );
                                        }}
                                        submitting={
                                            updateFinding.isPending
                                        }
                                        submitLabel="Enregistrer"
                                        allowResolved={
                                            true
                                        }
                                        allowLocationEdit={
                                            false
                                        }
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                                    {finding.resolved ? (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    ) : (
                                                        <AlertTriangle className="h-4 w-4" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-medium">
                                                            {
                                                                finding.title
                                                            }
                                                        </h3>

                                                        <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">
                                                            {SEVERITY_LABELS[
                                                                finding.severity ??
                                                                    ""
                                                            ] ??
                                                                finding.severity ??
                                                                "Non renseignée"}
                                                        </span>

                                                        {finding.resolved && (
                                                            <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                                                                Résolu
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {getLocationLabel(
                                                            finding,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {canEdit && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            startEdit(
                                                                finding,
                                                            )
                                                        }
                                                        disabled={
                                                            busy
                                                        }
                                                    >
                                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                                        Modifier
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            void handleDelete(
                                                                finding,
                                                            )
                                                        }
                                                        disabled={
                                                            busy
                                                        }
                                                    >
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                        Supprimer
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {finding.description && (
                                            <p className="text-sm">
                                                {
                                                    finding.description
                                                }
                                            </p>
                                        )}

                                        <div className="grid gap-3 border-t pt-3 text-sm sm:grid-cols-2">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    Coût estimé
                                                </p>

                                                <p className="mt-1">
                                                    {finding.estimated_cost ??
                                                        "—"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    Maintenance liée
                                                </p>

                                                <p className="mt-1">
                                                    {finding.maintenance_request_id
                                                        ? "Oui"
                                                        : "Non"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ),
                    )}
                </div>
            )}
        </section>
    );
}