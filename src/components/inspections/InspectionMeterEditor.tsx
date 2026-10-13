import {
    useState,
    type FormEvent,
} from "react";

import {
    Gauge,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
    useAddInspectionMeter,
    useUpdateInspectionMeter,
    useDeleteInspectionMeter,
} from "@/hooks/use-inspections";

import type {
    InspectionMeterSnapshot,
    InspectionStatus,
} from "@/hooks/use-inspections";

type InspectionMeterEditorProps = {
    inspectionId: string;
    status: InspectionStatus;
    meters: InspectionMeterSnapshot[];
};

type MeterFormState = {
    meterType: string;
    meterNumber: string;
    reading: string;
    unit: string;
    observations: string;
};

const EMPTY_FORM: MeterFormState = {
    meterType: "electricity",
    meterNumber: "",
    reading: "",
    unit: "",
    observations: "",
};

const getErrorMessage = (
    error: unknown,
) =>
    error instanceof Error
        ? error.message
        : "Une erreur est survenue.";

const parseReading = (
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
        return null;
    }

    return parsed;
};

const getFormFromMeter = (
    meter: InspectionMeterSnapshot,
): MeterFormState => ({
    meterType:
        meter.meter_type ||
        "other",

    meterNumber:
        meter.meter_number ??
        "",

    reading:
        String(
            meter.reading,
        ),

    unit:
        meter.unit ??
        "",

    observations:
        meter.observations ??
        "",
});

type MeterFormProps = {
    form: MeterFormState;
    onChange: (
        form: MeterFormState,
    ) => void;
    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
    onCancel: () => void;
    submitting: boolean;
    submitLabel: string;
};

function MeterForm({
    form,
    onChange,
    onSubmit,
    onCancel,
    submitting,
    submitLabel,
}: MeterFormProps) {
    const reading =
        parseReading(
            form.reading,
        );

    return (
        <form
            className="space-y-4 rounded-lg border bg-muted/20 p-4"
            onSubmit={onSubmit}
        >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                    <Label htmlFor="inspection-meter-type">
                        Type de compteur
                    </Label>

                    <Input
                        id="inspection-meter-type"
                        list="inspection-meter-types"
                        value={form.meterType}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                meterType:
                                    event.target.value,
                            })
                        }
                        placeholder="Ex. electricity"
                        autoComplete="off"
                        disabled={submitting}
                    />

                    <datalist id="inspection-meter-types">
                        <option value="electricity" />
                        <option value="water" />
                        <option value="gas" />
                        <option value="other" />
                    </datalist>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="inspection-meter-number">
                        N° compteur
                    </Label>

                    <Input
                        id="inspection-meter-number"
                        value={form.meterNumber}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                meterNumber:
                                    event.target.value,
                            })
                        }
                        placeholder="Numéro / référence"
                        autoComplete="off"
                        disabled={submitting}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="inspection-meter-reading">
                        Relevé
                    </Label>

                    <Input
                        id="inspection-meter-reading"
                        type="number"
                        min={0}
                        step="any"
                        value={form.reading}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                reading:
                                    event.target.value,
                            })
                        }
                        placeholder="0"
                        disabled={submitting}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="inspection-meter-unit">
                        Unité
                    </Label>

                    <Input
                        id="inspection-meter-unit"
                        list="inspection-meter-units"
                        value={form.unit}
                        onChange={(event) =>
                            onChange({
                                ...form,
                                unit:
                                    event.target.value,
                            })
                        }
                        placeholder="Ex. kWh"
                        autoComplete="off"
                        disabled={submitting}
                    />

                    <datalist id="inspection-meter-units">
                        <option value="kWh" />
                        <option value="m³" />
                        <option value="L" />
                    </datalist>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="inspection-meter-observations">
                    Observations
                </Label>

                <Textarea
                    id="inspection-meter-observations"
                    value={form.observations}
                    onChange={(event) =>
                        onChange({
                            ...form,
                            observations:
                                event.target.value,
                        })
                    }
                    placeholder="État du compteur, accès, remarques..."
                    rows={3}
                    disabled={submitting}
                />
            </div>

            {reading === null && (
                <p className="text-sm text-destructive">
                    Le relevé doit être un nombre positif ou nul.
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
                        !form.meterType.trim() ||
                        reading === null
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

export function InspectionMeterEditor({
    inspectionId,
    status,
    meters,
}: InspectionMeterEditorProps) {
    const canEdit =
        status === "draft";

    const addMeter =
        useAddInspectionMeter();

    const updateMeter =
        useUpdateInspectionMeter();

    const deleteMeter =
        useDeleteInspectionMeter();

    const [
        showAddForm,
        setShowAddForm,
    ] = useState(false);

    const [
        addForm,
        setAddForm,
    ] = useState<MeterFormState>(
        EMPTY_FORM,
    );

    const [
        editingMeterId,
        setEditingMeterId,
    ] = useState<string | null>(
        null,
    );

    const [
        editForm,
        setEditForm,
    ] = useState<MeterFormState>(
        EMPTY_FORM,
    );

    const [
        actionError,
        setActionError,
    ] = useState<string | null>(
        null,
    );

    const busy =
        addMeter.isPending ||
        updateMeter.isPending ||
        deleteMeter.isPending;

    const handleAdd = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        const reading =
            parseReading(
                addForm.reading,
            );

        if (
            !canEdit ||
            !addForm.meterType.trim() ||
            reading === null
        ) {
            return;
        }

        setActionError(null);

        try {
            await addMeter.mutateAsync({
                p_inspection_id:
                    inspectionId,

                p_meter_type:
                    addForm.meterType.trim(),

                p_meter_number:
                    addForm.meterNumber.trim(),

                p_reading:
                    reading,

                p_unit:
                    addForm.unit.trim(),

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
        meter: InspectionMeterSnapshot,
    ) => {
        if (!canEdit) {
            return;
        }

        setActionError(null);

        setEditingMeterId(
            meter.id,
        );

        setEditForm(
            getFormFromMeter(meter),
        );

        setShowAddForm(
            false,
        );
    };

    const handleUpdate = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        const reading =
            parseReading(
                editForm.reading,
            );

        if (
            !canEdit ||
            !editingMeterId ||
            !editForm.meterType.trim() ||
            reading === null
        ) {
            return;
        }

        setActionError(null);

        try {
            await updateMeter.mutateAsync({
                p_meter_id:
                    editingMeterId,

                p_meter_type:
                    editForm.meterType.trim(),

                p_meter_number:
                    editForm.meterNumber.trim(),

                p_reading:
                    reading,

                p_unit:
                    editForm.unit.trim(),

                p_observations:
                    editForm.observations.trim(),
            });

            setEditingMeterId(
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
        meter: InspectionMeterSnapshot,
    ) => {
        if (
            !canEdit ||
            busy
        ) {
            return;
        }

        const meterLabel =
            meter.meter_number
                ? `${meter.meter_type} — ${meter.meter_number}`
                : meter.meter_type;

        const confirmed =
            window.confirm(
                `Supprimer le compteur « ${meterLabel} » ?`,
            );

        if (!confirmed) {
            return;
        }

        setActionError(null);

        try {
            await deleteMeter.mutateAsync({
                p_meter_id:
                    meter.id,
            });

            if (
                editingMeterId ===
                meter.id
            ) {
                setEditingMeterId(
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
                        Compteurs
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        {meters.length === 0
                            ? "Aucun relevé enregistré."
                            : `${meters.length} compteur${
                                  meters.length > 1
                                      ? "s"
                                      : ""
                              } enregistré${
                                  meters.length > 1
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

                            setEditingMeterId(
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
                        Ajouter un compteur
                    </Button>
                )}
            </div>

            {!canEdit && (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Les relevés de compteurs sont en
                    lecture seule car cet état des lieux
                    n’est plus en brouillon.
                </div>
            )}

            {actionError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {actionError}
                </div>
            )}

            {canEdit &&
                showAddForm && (
                    <MeterForm
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
                            addMeter.isPending
                        }
                        submitLabel="Ajouter le compteur"
                    />
                )}

            {meters.length === 0 &&
            !showAddForm ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <Gauge className="mx-auto h-8 w-8 text-muted-foreground" />

                    <p className="mt-3 font-medium">
                        Aucun compteur
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {canEdit
                            ? "Ajoutez les relevés d’électricité, d’eau, de gaz ou tout autre compteur."
                            : "Aucun relevé de compteur n’a été enregistré."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {meters.map(
                        (meter) => (
                            <div
                                key={meter.id}
                                className="rounded-lg border bg-card p-4"
                            >
                                {editingMeterId ===
                                meter.id ? (
                                    <MeterForm
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
                                            setEditingMeterId(
                                                null,
                                            );

                                            setEditForm(
                                                EMPTY_FORM,
                                            );
                                        }}
                                        submitting={
                                            updateMeter.isPending
                                        }
                                        submitLabel="Enregistrer"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                                    <Gauge className="h-4 w-4" />
                                                </div>

                                                <div>
                                                    <h3 className="font-medium">
                                                        {meter.meter_type}
                                                    </h3>

                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {meter.meter_number
                                                            ? `N° ${meter.meter_number}`
                                                            : "Numéro non renseigné"}
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
                                                                meter,
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
                                                                meter,
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

                                        <div className="grid gap-3 border-t pt-3 text-sm sm:grid-cols-2">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    Relevé
                                                </p>

                                                <p className="mt-1 font-medium">
                                                    {meter.reading}
                                                    {meter.unit
                                                        ? ` ${meter.unit}`
                                                        : ""}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    Unité
                                                </p>

                                                <p className="mt-1">
                                                    {meter.unit ||
                                                        "—"}
                                                </p>
                                            </div>
                                        </div>

                                        {meter.observations && (
                                            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                                                {
                                                    meter.observations
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
        </section>
    );
}