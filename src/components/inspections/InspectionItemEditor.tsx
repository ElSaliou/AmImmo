import {
    useState,
    type FormEvent,
} from "react";

import {
    PackageOpen,
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
    useAddInspectionItem,
    useUpdateInspectionItem,
    useDeleteInspectionItem,
} from "@/hooks/use-inspections";

import type {
    InspectionCondition,
    InspectionItemSnapshot,
    InspectionStatus,
} from "@/hooks/use-inspections";

type InspectionItemEditorProps = {
    roomId: string;
    status: InspectionStatus;
    items: InspectionItemSnapshot[];
};

type ItemFormState = {
    name: string;
    itemType: string;
    quantity: string;
    condition: InspectionCondition;
    observations: string;
};

const EMPTY_FORM: ItemFormState = {
    name: "",
    itemType: "other",
    quantity: "1",
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

const getFormFromItem = (
    item: InspectionItemSnapshot,
): ItemFormState => ({
    name:
        item.name ?? "",

    itemType:
        item.item_type ||
        "other",

    quantity:
        String(
            item.quantity ?? 1,
        ),

    condition:
        item.condition ??
        "good",

    observations:
        item.observations ??
        "",
});

const parseQuantity = (
    value: string,
) => {
    const parsed =
        Number.parseInt(
            value,
            10,
        );

    if (
        !Number.isFinite(parsed) ||
        parsed < 1
    ) {
        return null;
    }

    return parsed;
};

type ItemFormProps = {
    form: ItemFormState;
    onChange: (
        form: ItemFormState,
    ) => void;
    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
    onCancel: () => void;
    submitting: boolean;
    submitLabel: string;
};

function ItemForm({
    form,
    onChange,
    onSubmit,
    onCancel,
    submitting,
    submitLabel,
}: ItemFormProps) {
    const quantity =
        parseQuantity(
            form.quantity,
        );

    return (
        <form
            className="space-y-4 rounded-lg border bg-muted/20 p-4"
            onSubmit={onSubmit}
        >
            <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="inspection-item-name">
                        Nom
                    </Label>

                    <Input
                        id="inspection-item-name"
                        value={form.name}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                name:
                                    event.target.value,
                            })
                        }
                        placeholder="Ex. Porte d’entrée"
                        autoComplete="off"
                        disabled={submitting}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="inspection-item-type">
                        Type
                    </Label>

                    <Input
                        id="inspection-item-type"
                        list="inspection-item-types"
                        value={form.itemType}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                itemType:
                                    event.target.value,
                            })
                        }
                        placeholder="Ex. door"
                        autoComplete="off"
                        disabled={submitting}
                    />

                    <datalist id="inspection-item-types">
                        <option value="door" />
                        <option value="window" />
                        <option value="wall" />
                        <option value="floor" />
                        <option value="ceiling" />
                        <option value="light" />
                        <option value="socket" />
                        <option value="switch" />
                        <option value="furniture" />
                        <option value="appliance" />
                        <option value="sanitary" />
                        <option value="other" />
                    </datalist>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="inspection-item-quantity">
                        Quantité
                    </Label>

                    <Input
                        id="inspection-item-quantity"
                        type="number"
                        min={1}
                        step={1}
                        value={form.quantity}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                quantity:
                                    event.target.value,
                            })
                        }
                        disabled={submitting}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>
                    État
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

            <div className="space-y-2">
                <Label htmlFor="inspection-item-observations">
                    Observations
                </Label>

                <Textarea
                    id="inspection-item-observations"
                    value={form.observations}
                    onChange={(event) =>
                        onChange({
                            ...form,
                            observations:
                                event.target.value,
                        })
                    }
                    placeholder="État, défauts ou remarques..."
                    rows={3}
                    disabled={submitting}
                />
            </div>

            {quantity === null && (
                <p className="text-sm text-destructive">
                    La quantité doit être au moins égale à 1.
                </p>
            )}

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
                        !form.name.trim() ||
                        quantity === null
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

export function InspectionItemEditor({
    roomId,
    status,
    items,
}: InspectionItemEditorProps) {
    const canEdit =
        status === "draft";

    const addItem =
        useAddInspectionItem();

    const updateItem =
        useUpdateInspectionItem();

    const deleteItem =
        useDeleteInspectionItem();

    const [
        showAddForm,
        setShowAddForm,
    ] = useState(false);

    const [
        addForm,
        setAddForm,
    ] = useState<ItemFormState>(
        EMPTY_FORM,
    );

    const [
        editingItemId,
        setEditingItemId,
    ] = useState<string | null>(
        null,
    );

    const [
        editForm,
        setEditForm,
    ] = useState<ItemFormState>(
        EMPTY_FORM,
    );

    const [
        actionError,
        setActionError,
    ] = useState<string | null>(
        null,
    );

    const busy =
        addItem.isPending ||
        updateItem.isPending ||
        deleteItem.isPending;

    const handleAdd = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        const quantity =
            parseQuantity(
                addForm.quantity,
            );

        if (
            !canEdit ||
            !addForm.name.trim() ||
            quantity === null
        ) {
            return;
        }

        setActionError(null);

        try {
            await addItem.mutateAsync({
                p_room_id:
                    roomId,

                p_name:
                    addForm.name.trim(),

                p_item_type:
                    addForm.itemType.trim() ||
                    "other",

                p_quantity:
                    quantity,

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
        item: InspectionItemSnapshot,
    ) => {
        if (!canEdit) {
            return;
        }

        setActionError(null);

        setEditingItemId(
            item.id,
        );

        setEditForm(
            getFormFromItem(item),
        );

        setShowAddForm(
            false,
        );
    };

    const handleUpdate = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        const quantity =
            parseQuantity(
                editForm.quantity,
            );

        if (
            !canEdit ||
            !editingItemId ||
            !editForm.name.trim() ||
            quantity === null
        ) {
            return;
        }

        setActionError(null);

        try {
            await updateItem.mutateAsync({
                p_item_id:
                    editingItemId,

                p_name:
                    editForm.name.trim(),

                p_item_type:
                    editForm.itemType.trim() ||
                    "other",

                p_quantity:
                    quantity,

                p_condition:
                    editForm.condition,

                p_observations:
                    editForm.observations.trim(),
            });

            setEditingItemId(
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
        item: InspectionItemSnapshot,
    ) => {
        if (
            !canEdit ||
            busy
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                `Supprimer l’élément « ${item.name} » ?`,
            );

        if (!confirmed) {
            return;
        }

        setActionError(null);

        try {
            await deleteItem.mutateAsync({
                p_item_id:
                    item.id,
            });

            if (
                editingItemId ===
                item.id
            ) {
                setEditingItemId(
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
        <div className="space-y-3 border-t pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h4 className="text-sm font-semibold">
                        Équipements / éléments
                    </h4>

                    <p className="text-xs text-muted-foreground">
                        {items.length === 0
                            ? "Aucun élément enregistré."
                            : `${items.length} élément${
                                  items.length > 1
                                      ? "s"
                                      : ""
                              } enregistré${
                                  items.length > 1
                                      ? "s"
                                      : ""
                              }.`}
                    </p>
                </div>

                {canEdit && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setActionError(null);

                            setEditingItemId(
                                null,
                            );

                            setShowAddForm(
                                (current) =>
                                    !current,
                            );
                        }}
                        disabled={busy}
                    >
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Ajouter
                    </Button>
                )}
            </div>

            {actionError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {actionError}
                </div>
            )}

            {canEdit &&
                showAddForm && (
                    <ItemForm
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
                            addItem.isPending
                        }
                        submitLabel="Ajouter l’élément"
                    />
                )}

            {items.length === 0 &&
            !showAddForm ? (
                <div className="rounded-md border border-dashed px-4 py-5 text-center">
                    <PackageOpen className="mx-auto h-6 w-6 text-muted-foreground" />

                    <p className="mt-2 text-sm text-muted-foreground">
                        {canEdit
                            ? "Ajoutez les équipements ou éléments contrôlés dans cette pièce."
                            : "Aucun équipement enregistré."}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map(
                        (
                            item,
                            itemIndex,
                        ) => (
                            <div
                                key={item.id}
                                className="rounded-md border bg-background p-3"
                            >
                                {editingItemId ===
                                item.id ? (
                                    <ItemForm
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
                                            setEditingItemId(
                                                null,
                                            );

                                            setEditForm(
                                                EMPTY_FORM,
                                            );
                                        }}
                                        submitting={
                                            updateItem.isPending
                                        }
                                        submitLabel="Enregistrer"
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-medium">
                                                        {item.name}
                                                    </p>

                                                    <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">
                                                        Élément{" "}
                                                        {itemIndex +
                                                            1}
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Type :{" "}
                                                    {item.item_type ||
                                                        "other"}
                                                </p>
                                            </div>

                                            {canEdit && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            startEdit(
                                                                item,
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
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            void handleDelete(
                                                                item,
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

                                        <div className="grid gap-2 text-sm sm:grid-cols-3">
                                            <div>
                                                <span className="text-xs text-muted-foreground">
                                                    État
                                                </span>

                                                <p>
                                                    {
                                                        CONDITION_LABELS[
                                                            item.condition ??
                                                                "good"
                                                        ]
                                                    }
                                                </p>
                                            </div>

                                            <div>
                                                <span className="text-xs text-muted-foreground">
                                                    Quantité
                                                </span>

                                                <p>
                                                    {item.quantity ??
                                                        1}
                                                </p>
                                            </div>

                                            <div>
                                                <span className="text-xs text-muted-foreground">
                                                    Position
                                                </span>

                                                <p>
                                                    {item.position +
                                                        1}
                                                </p>
                                            </div>
                                        </div>

                                        {item.observations && (
                                            <div className="rounded bg-muted/40 px-3 py-2 text-sm">
                                                {
                                                    item.observations
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}