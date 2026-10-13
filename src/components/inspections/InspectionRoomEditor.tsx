import {
    useState,
    type FormEvent,
} from "react";

import {
    DoorOpen,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { InspectionItemEditor } from "@/components/inspections/InspectionItemEditor";
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
    useAddInspectionRoom,
    useUpdateInspectionRoom,
    useDeleteInspectionRoom,
} from "@/hooks/use-inspections";

import type {
    InspectionCondition,
    InspectionRoomSnapshot,
    InspectionStatus,
} from "@/hooks/use-inspections";

type InspectionRoomEditorProps = {
    inspectionId: string;
    status: InspectionStatus;
    rooms: InspectionRoomSnapshot[];
};

type RoomFormState = {
    name: string;
    roomType: string;
    condition: InspectionCondition;
    observations: string;
};

const EMPTY_FORM: RoomFormState = {
    name: "",
    roomType: "other",
    condition: "good",
    observations: "",
};

const CONDITION_OPTIONS: Array<{
    value: InspectionCondition;
    label: string;
}> = [
    {
        value: "excellent",
        label: "Excellent",
    },
    {
        value: "good",
        label: "Bon",
    },
    {
        value: "fair",
        label: "Moyen",
    },
    {
        value: "poor",
        label: "Mauvais",
    },
    {
        value: "damaged",
        label: "Endommagé",
    },
    {
        value: "not_applicable",
        label: "Non applicable",
    },
];

const CONDITION_LABELS = Object.fromEntries(
    CONDITION_OPTIONS.map(
        (option) => [
            option.value,
            option.label,
        ],
    ),
) as Record<
    InspectionCondition,
    string
>;

const getErrorMessage = (
    error: unknown,
) =>
    error instanceof Error
        ? error.message
        : "Une erreur est survenue.";

const getFormFromRoom = (
    room: InspectionRoomSnapshot,
): RoomFormState => ({
    name:
        room.name ?? "",

    roomType:
        room.room_type ||
        "other",

    condition:
        room.condition ??
        "good",

    observations:
        room.observations ??
        "",
});

type RoomFormProps = {
    form: RoomFormState;
    onChange: (
        form: RoomFormState,
    ) => void;
    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
    onCancel: () => void;
    submitting: boolean;
    submitLabel: string;
};

function RoomForm({
    form,
    onChange,
    onSubmit,
    onCancel,
    submitting,
    submitLabel,
}: RoomFormProps) {
    return (
        <form
            className="space-y-4 rounded-lg border bg-muted/20 p-4"
            onSubmit={onSubmit}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="inspection-room-name">
                        Nom de la pièce
                    </Label>

                    <Input
                        id="inspection-room-name"
                        value={form.name}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                name: event.target.value,
                            })
                        }
                        placeholder="Ex. Salon"
                        autoComplete="off"
                        disabled={submitting}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="inspection-room-type">
                        Type
                    </Label>

                    <Input
                        id="inspection-room-type"
                        list="inspection-room-types"
                        value={form.roomType}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                roomType:
                                    event.target.value,
                            })
                        }
                        placeholder="Ex. living_room"
                        autoComplete="off"
                        disabled={submitting}
                    />

                    <datalist id="inspection-room-types">
                        <option value="living_room" />
                        <option value="bedroom" />
                        <option value="kitchen" />
                        <option value="bathroom" />
                        <option value="wc" />
                        <option value="hallway" />
                        <option value="balcony" />
                        <option value="terrace" />
                        <option value="garage" />
                        <option value="storage" />
                        <option value="other" />
                    </datalist>

                    <p className="text-xs text-muted-foreground">
                        Le type reste libre afin de respecter
                        le champ texte du backend.
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <Label>
                    État général
                </Label>

                <Select
                    value={form.condition}
                    onValueChange={(value) =>
                        onChange({
                            ...form,
                            condition:
                                value as InspectionCondition,
                        })
                    }
                    disabled={submitting}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                        {CONDITION_OPTIONS.map(
                            (option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ),
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="inspection-room-observations">
                    Observations
                </Label>

                <Textarea
                    id="inspection-room-observations"
                    value={form.observations}
                    onChange={(event) =>
                        onChange({
                            ...form,
                            observations:
                                event.target.value,
                        })
                    }
                    placeholder="Observations générales sur la pièce..."
                    rows={3}
                    disabled={submitting}
                />
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
                        !form.name.trim()
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

export function InspectionRoomEditor({
    inspectionId,
    status,
    rooms,
}: InspectionRoomEditorProps) {
    const canEdit =
        status === "draft";

    const addRoom =
        useAddInspectionRoom();

    const updateRoom =
        useUpdateInspectionRoom();

    const deleteRoom =
        useDeleteInspectionRoom();

    const [
        showAddForm,
        setShowAddForm,
    ] = useState(false);

    const [
        addForm,
        setAddForm,
    ] = useState<RoomFormState>(
        EMPTY_FORM,
    );

    const [
        editingRoomId,
        setEditingRoomId,
    ] = useState<string | null>(
        null,
    );

    const [
        editForm,
        setEditForm,
    ] = useState<RoomFormState>(
        EMPTY_FORM,
    );

    const [
        actionError,
        setActionError,
    ] = useState<string | null>(
        null,
    );

    const busy =
        addRoom.isPending ||
        updateRoom.isPending ||
        deleteRoom.isPending;

    const handleAdd = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (
            !canEdit ||
            !addForm.name.trim()
        ) {
            return;
        }

        setActionError(null);

        try {
            await addRoom.mutateAsync({
                p_inspection_id:
                    inspectionId,

                p_name:
                    addForm.name.trim(),

                p_room_type:
                    addForm.roomType.trim() ||
                    "other",

                p_condition:
                    addForm.condition,

                p_observations:
                    addForm.observations.trim(),
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
        room: InspectionRoomSnapshot,
    ) => {
        if (!canEdit) {
            return;
        }

        setActionError(null);

        setEditingRoomId(
            room.id,
        );

        setEditForm(
            getFormFromRoom(room),
        );

        setShowAddForm(
            false,
        );
    };

    const handleUpdate = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (
            !canEdit ||
            !editingRoomId ||
            !editForm.name.trim()
        ) {
            return;
        }

        setActionError(null);

        try {
            await updateRoom.mutateAsync({
                p_room_id:
                    editingRoomId,

                p_name:
                    editForm.name.trim(),

                p_room_type:
                    editForm.roomType.trim() ||
                    "other",

                p_condition:
                    editForm.condition,

                p_observations:
                    editForm.observations.trim(),
            });

            setEditingRoomId(
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
        room: InspectionRoomSnapshot,
    ) => {
        if (
            !canEdit ||
            busy
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                `Supprimer la pièce « ${room.name} » ?`,
            );

        if (!confirmed) {
            return;
        }

        setActionError(null);

        try {
            await deleteRoom.mutateAsync({
                p_room_id:
                    room.id,
            });

            if (
                editingRoomId ===
                room.id
            ) {
                setEditingRoomId(
                    null,
                );
            }
        } catch (error) {
            setActionError(
                getErrorMessage(error),
            );
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        Pièces
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        {rooms.length === 0
                            ? "Aucune pièce enregistrée."
                            : `${rooms.length} pièce${
                                  rooms.length > 1
                                      ? "s"
                                      : ""
                              } enregistrée${
                                  rooms.length > 1
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
                            setEditingRoomId(null);
                            setShowAddForm(
                                (current) =>
                                    !current,
                            );
                        }}
                        disabled={busy}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter une pièce
                    </Button>
                )}
            </div>

            {!canEdit && (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Cet état des lieux n’est plus en
                    brouillon. Les pièces sont en lecture
                    seule.
                </div>
            )}

            {actionError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {actionError}
                </div>
            )}

            {canEdit &&
                showAddForm && (
                    <RoomForm
                        form={addForm}
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
                            addRoom.isPending
                        }
                        submitLabel="Ajouter la pièce"
                    />
                )}

            {rooms.length === 0 &&
            !showAddForm ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <DoorOpen className="mx-auto h-8 w-8 text-muted-foreground" />

                    <p className="mt-3 font-medium">
                        Aucune pièce
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {canEdit
                            ? "Ajoutez la première pièce de l’état des lieux."
                            : "Aucune pièce n’a été enregistrée."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rooms.map(
                        (
                            room,
                            roomIndex,
                        ) => (
                            <div
                                key={room.id}
                                className="rounded-lg border bg-card p-4"
                            >
                                {editingRoomId ===
                                room.id ? (
                                    <RoomForm
                                        form={
                                            editForm
                                        }
                                        onChange={
                                            setEditForm
                                        }
                                        onSubmit={
                                            handleUpdate
                                        }
                                        onCancel={() => {
                                            setEditingRoomId(
                                                null,
                                            );

                                            setEditForm(
                                                EMPTY_FORM,
                                            );
                                        }}
                                        submitting={
                                            updateRoom.isPending
                                        }
                                        submitLabel="Enregistrer"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                                    <DoorOpen className="h-4 w-4" />
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-medium">
                                                            {room.name}
                                                        </h3>

                                                        <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">
                                                            Pièce{" "}
                                                            {roomIndex +
                                                                1}
                                                        </span>
                                                    </div>

                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Type :{" "}
                                                        {room.room_type ||
                                                            "other"}
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
                                                                room,
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
                                                                room,
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

                                        <div className="grid gap-3 border-t pt-3 text-sm sm:grid-cols-3">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    État
                                                </p>

                                                <p className="mt-1">
                                                    {CONDITION_LABELS[
                                                        room.condition ??
                                                            "good"
                                                    ]}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    Équipements
                                                </p>

                                                <p className="mt-1">
                                                    {
                                                        room
                                                            .items
                                                            .length
                                                    }
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    Position
                                                </p>

                                                <p className="mt-1">
                                                    {room.position +
                                                        1}
                                                </p>
                                            </div>
                                        </div>

                                        {room.observations && (
                                            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                                                {
                                                    room.observations
                                                }
                                            </div>
                                        )}

                                        <InspectionItemEditor
                                            roomId={
                                                room.id
                                            }
                                            status={
                                                status
                                            }
                                            items={
                                                room.items
                                            }
                                        />
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