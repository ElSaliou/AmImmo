import {
  useEffect,
  useState,
} from "react";

import {
  Loader2,
  UserPlus,
} from "lucide-react";

import { toast } from "sonner";

import {
  Guest,
  GuestInput,
  useCreateGuest,
  useUpdateGuest,
} from "@/hooks/use-guests";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

// ============================================================
// TYPES
// ============================================================

type GuestFormDialogProps = {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  /**
   * Si guest est fourni :
   * mode modification.
   *
   * Sinon :
   * mode création.
   */
  guest?: Guest | null;

  /**
   * Callback facultatif.
   *
   * Permet notamment au BookingFormDialog
   * de sélectionner automatiquement
   * le voyageur qui vient d'être créé.
   */
  onSuccess?: (
    guest: Guest,
  ) => void;
};

type GuestFormState = {
  full_name: string;

  email: string;
  phone: string;

  nationality: string;
  date_of_birth: string;

  id_type: string;
  id_number: string;
  id_expiry_date: string;

  address: string;
  city: string;
  country: string;

  notes: string;
};

// ============================================================
// CONSTANTS
// ============================================================

const EMPTY_FORM: GuestFormState = {
  full_name: "",

  email: "",
  phone: "",

  nationality: "",
  date_of_birth: "",

  id_type: "",
  id_number: "",
  id_expiry_date: "",

  address: "",
  city: "",
  country: "",

  notes: "",
};

const ID_TYPES = [
  {
    value: "passport",
    label: "Passeport",
  },
  {
    value: "national_id",
    label:
      "Carte nationale d'identité",
  },
  {
    value: "residence_permit",
    label: "Titre de séjour",
  },
  {
    value: "driving_license",
    label: "Permis de conduire",
  },
  {
    value: "other",
    label: "Autre",
  },
];

// ============================================================
// HELPERS
// ============================================================

const toFormState = (
  guest?: Guest | null,
): GuestFormState => {
  if (!guest) {
    return {
      ...EMPTY_FORM,
    };
  }

  return {
    full_name:
      guest.full_name ?? "",

    email:
      guest.email ?? "",

    phone:
      guest.phone ?? "",

    nationality:
      guest.nationality ?? "",

    date_of_birth:
      guest.date_of_birth ?? "",

    id_type:
      guest.id_type ?? "",

    id_number:
      guest.id_number ?? "",

    id_expiry_date:
      guest.id_expiry_date ?? "",

    address:
      guest.address ?? "",

    city:
      guest.city ?? "",

    country:
      guest.country ?? "",

    notes:
      guest.notes ?? "",
  };
};

// ============================================================
// COMPONENT
// ============================================================

export default function GuestFormDialog({
  open,
  onOpenChange,
  guest,
  onSuccess,
}: GuestFormDialogProps) {
  const createGuest =
    useCreateGuest();

  const updateGuest =
    useUpdateGuest();

  const [
    form,
    setForm,
  ] =
    useState<GuestFormState>(
      () =>
        toFormState(
          guest,
        ),
    );

  const isEditing =
    Boolean(
      guest?.id,
    );

  const isSubmitting =
    createGuest.isPending ||
    updateGuest.isPending;

  // ==========================================================
  // RESET / LOAD
  // ==========================================================

  useEffect(
    () => {
      if (!open) {
        return;
      }

      setForm(
        toFormState(
          guest,
        ),
      );
    },
    [
      open,
      guest,
    ],
  );

  const updateField = <
    K extends keyof GuestFormState,
  >(
    field: K,
    value: GuestFormState[K],
  ) => {
    setForm(
      (
        current,
      ) => ({
        ...current,

        [field]:
          value,
      }),
    );
  };

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validate =
    () => {
      if (
        !form.full_name.trim()
      ) {
        toast.error(
          "Le nom complet du voyageur est obligatoire.",
        );

        return false;
      }

      /**
       * public.guests.phone est NOT NULL.
       */
      if (
        !form.phone.trim()
      ) {
        toast.error(
          "Le numéro de téléphone du voyageur est obligatoire.",
        );

        return false;
      }

      if (
        form.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form.email.trim(),
        )
      ) {
        toast.error(
          "L'adresse e-mail n'est pas valide.",
        );

        return false;
      }

      if (
        form.id_expiry_date &&
        Number.isNaN(
          new Date(
            `${form.id_expiry_date}T00:00:00`,
          ).getTime(),
        )
      ) {
        toast.error(
          "La date d'expiration de la pièce d'identité est invalide.",
        );

        return false;
      }

      return true;
    };

  // ==========================================================
  // PAYLOAD
  // ==========================================================

  const buildPayload =
    (): GuestInput => ({
      full_name:
        form.full_name.trim(),

      email:
        form.email.trim() ||
        null,

      /**
       * Obligatoire côté base.
       */
      phone:
        form.phone.trim(),

      nationality:
        form.nationality.trim() ||
        null,

      date_of_birth:
        form.date_of_birth ||
        null,

      id_type:
        form.id_type ||
        null,

      id_number:
        form.id_number.trim() ||
        null,

      /**
       * Colonne réellement présente
       * dans public.guests.
       */
      id_expiry_date:
        form.id_expiry_date ||
        null,

      address:
        form.address.trim() ||
        null,

      city:
        form.city.trim() ||
        null,

      country:
        form.country.trim() ||
        null,

      notes:
        form.notes.trim() ||
        null,
    });

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        isSubmitting
      ) {
        return;
      }

      if (!validate()) {
        return;
      }

      try {
        let savedGuest: Guest;

        if (
          guest?.id
        ) {
          savedGuest =
            await updateGuest.mutateAsync(
              {
                id:
                  guest.id,

                ...buildPayload(),
              },
            );

          toast.success(
            "Voyageur modifié avec succès.",
          );
        } else {
          savedGuest =
            await createGuest.mutateAsync(
              buildPayload(),
            );

          toast.success(
            "Voyageur créé avec succès.",
          );
        }

        onSuccess?.(
          savedGuest,
        );

        onOpenChange(
          false,
        );

        if (!guest) {
          setForm({
            ...EMPTY_FORM,
          });
        }
      } catch (
        error: any
      ) {
        console.error(
          "[GuestFormDialog] Erreur enregistrement voyageur :",
          error,
        );

        /**
         * Les erreurs PostgREST/Supabase
         * ne sont pas toujours des instances
         * natives de Error.
         */
        const message =
          error?.message ||
          error?.details ||
          error?.hint ||
          "Impossible d'enregistrer le voyageur.";

        const code =
          error?.code
            ? ` (${error.code})`
            : "";

        toast.error(
          `${message}${code}`,
        );
      }
    };

  // ==========================================================
  // OPEN / CLOSE
  // ==========================================================

  const handleOpenChange =
    (
      nextOpen: boolean,
    ) => {
      if (
        !nextOpen &&
        isSubmitting
      ) {
        return;
      }

      onOpenChange(
        nextOpen,
      );
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Dialog
      open={open}
      onOpenChange={
        handleOpenChange
      }
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form
          onSubmit={
            handleSubmit
          }
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />

              {isEditing
                ? "Modifier le voyageur"
                : "Nouveau voyageur"}
            </DialogTitle>

            <DialogDescription>
              {isEditing
                ? "Modifiez les informations du voyageur."
                : "Enregistrez un voyageur pour les locations de courte durée."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            {/* ========================================== */}
            {/* IDENTITE                                   */}
            {/* ========================================== */}

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">
                  Identité
                </h3>

                <p className="text-xs text-muted-foreground">
                  Informations principales du voyageur.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="guest-full-name">
                    Nom complet *
                  </Label>

                  <Input
                    id="guest-full-name"
                    value={
                      form.full_name
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "full_name",
                        event.target.value,
                      )
                    }
                    placeholder="Ex. Mamadou Diallo"
                    autoComplete="name"
                    disabled={
                      isSubmitting
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest-nationality">
                    Nationalité
                  </Label>

                  <Input
                    id="guest-nationality"
                    value={
                      form.nationality
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "nationality",
                        event.target.value,
                      )
                    }
                    placeholder="Ex. Guinéenne"
                    disabled={
                      isSubmitting
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest-date-of-birth">
                    Date de naissance
                  </Label>

                  <Input
                    id="guest-date-of-birth"
                    type="date"
                    value={
                      form.date_of_birth
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "date_of_birth",
                        event.target.value,
                      )
                    }
                    disabled={
                      isSubmitting
                    }
                  />
                </div>
              </div>
            </section>

            {/* ========================================== */}
            {/* COORDONNEES                                */}
            {/* ========================================== */}

            <section className="space-y-4 border-t pt-5">
              <div>
                <h3 className="text-sm font-semibold">
                  Coordonnées
                </h3>

                <p className="text-xs text-muted-foreground">
                  Moyens de contact et adresse du voyageur.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guest-phone">
                    Téléphone *
                  </Label>

                  <Input
                    id="guest-phone"
                    type="tel"
                    value={
                      form.phone
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "phone",
                        event.target.value,
                      )
                    }
                    placeholder="+224 6XX XX XX XX"
                    autoComplete="tel"
                    disabled={
                      isSubmitting
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest-email">
                    E-mail
                  </Label>

                  <Input
                    id="guest-email"
                    type="email"
                    value={
                      form.email
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "email",
                        event.target.value,
                      )
                    }
                    placeholder="voyageur@email.com"
                    autoComplete="email"
                    disabled={
                      isSubmitting
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="guest-address">
                    Adresse
                  </Label>

                  <Input
                    id="guest-address"
                    value={
                      form.address
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "address",
                        event.target.value,
                      )
                    }
                    placeholder="Adresse"
                    autoComplete="street-address"
                    disabled={
                      isSubmitting
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest-city">
                    Ville
                  </Label>

                  <Input
                    id="guest-city"
                    value={
                      form.city
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "city",
                        event.target.value,
                      )
                    }
                    placeholder="Ex. Conakry"
                    autoComplete="address-level2"
                    disabled={
                      isSubmitting
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest-country">
                    Pays
                  </Label>

                  <Input
                    id="guest-country"
                    value={
                      form.country
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "country",
                        event.target.value,
                      )
                    }
                    placeholder="Ex. Guinée"
                    autoComplete="country-name"
                    disabled={
                      isSubmitting
                    }
                  />
                </div>
              </div>
            </section>

            {/* ========================================== */}
            {/* PIECE D'IDENTITE                           */}
            {/* ========================================== */}

            <section className="space-y-4 border-t pt-5">
              <div>
                <h3 className="text-sm font-semibold">
                  Pièce d'identité
                </h3>

                <p className="text-xs text-muted-foreground">
                  Facultatif à la création. Ces informations pourront être complétées avant le séjour.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Type de pièce
                  </Label>

                  <Select
                    value={
                      form.id_type ||
                      undefined
                    }
                    onValueChange={(
                      value,
                    ) =>
                      updateField(
                        "id_type",
                        value,
                      )
                    }
                    disabled={
                      isSubmitting
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>

                    <SelectContent>
                      {ID_TYPES.map(
                        (
                          item,
                        ) => (
                          <SelectItem
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {
                              item.label
                            }
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest-id-number">
                    Numéro de pièce
                  </Label>

                  <Input
                    id="guest-id-number"
                    value={
                      form.id_number
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "id_number",
                        event.target.value,
                      )
                    }
                    placeholder="Numéro du document"
                    disabled={
                      isSubmitting
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guest-id-expiry-date">
                    Date d'expiration
                  </Label>

                  <Input
                    id="guest-id-expiry-date"
                    type="date"
                    value={
                      form.id_expiry_date
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "id_expiry_date",
                        event.target.value,
                      )
                    }
                    disabled={
                      isSubmitting
                    }
                  />
                </div>
              </div>
            </section>

            {/* ========================================== */}
            {/* NOTES                                      */}
            {/* ========================================== */}

            <section className="space-y-4 border-t pt-5">
              <div className="space-y-2">
                <Label htmlFor="guest-notes">
                  Notes internes
                </Label>

                <Textarea
                  id="guest-notes"
                  value={
                    form.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "notes",
                      event.target.value,
                    )
                  }
                  placeholder="Informations complémentaires sur le voyageur..."
                  rows={4}
                  disabled={
                    isSubmitting
                  }
                />
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleOpenChange(
                  false,
                )
              }
              disabled={
                isSubmitting
              }
            >
              Annuler
            </Button>

            <Button
              type="submit"
              disabled={
                isSubmitting
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                  Enregistrement...
                </>
              ) : isEditing ? (
                "Enregistrer les modifications"
              ) : (
                "Créer le voyageur"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}