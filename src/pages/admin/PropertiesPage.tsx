import {
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Armchair,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
  Archive,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import {
  toast,
} from "sonner";

import PageShell from "@/components/PageShell";

import PropertyFormDialog from "@/components/admin/PropertyFormDialog";

import TableSkeleton from "@/components/admin/TableSkeleton";

import EmptyState from "@/components/admin/EmptyState";

import {
  useApprovePropertyReavailability,
  useDeleteProperty,
  useProperties,
  usePropertyControlDecision,
  useTogglePublish,
} from "@/hooks/use-properties";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

import {
  conakryCommunes,
  formatDate,
  formatMoney,
  listingTypeLabels,
  propertyStatusLabels,
  propertyTypeLabels,
} from "@/constants/real-estate";

const statusClass:
  Record<
    string,
    string
  > = {
  draft:
    "bg-muted text-muted-foreground",

  published:
    "bg-success/15 text-success",

  archived:
    "bg-destructive/15 text-destructive",

  rented:
    "bg-info/15 text-info",

  sold:
    "bg-secondary/15 text-secondary",

  reserved:
    "bg-warning/15 text-warning",

  maintenance:
    "bg-orange-500/15 text-orange-600",

  unavailable:
    "bg-muted text-muted-foreground",
};

type PropertyRow =
  Record<
    string,
    any
  >;

const PropertiesPage =
  () => {
    const {
      data: properties,
      isLoading,
    } =
      useProperties();

    const deleteProp =
      useDeleteProperty();

    const togglePublish =
      useTogglePublish();

    const approveReavailability =
      useApprovePropertyReavailability();

    const controlDecision =
      usePropertyControlDecision();

    const [
      formOpen,
      setFormOpen,
    ] =
      useState(false);

    const [
      editId,
      setEditId,
    ] =
      useState<
        string | undefined
      >();

    const [
      search,
      setSearch,
    ] =
      useState("");

    const [
      filterType,
      setFilterType,
    ] =
      useState(
        "__all__",
      );

    const [
      filterStatus,
      setFilterStatus,
    ] =
      useState(
        "__all__",
      );

    const [
      filterPropertyType,
      setFilterPropertyType,
    ] =
      useState(
        "__all__",
      );

    const [
      filterCommune,
      setFilterCommune,
    ] =
      useState(
        "__all__",
      );

    /*
     * ========================================================
     * CONTRÔLE POST-LOCATION
     * ========================================================
     */

    const [
      controlOpen,
      setControlOpen,
    ] =
      useState(false);

    const [
      controlProperty,
      setControlProperty,
    ] =
      useState<
        PropertyRow | null
      >(null);

    const [
      controlNote,
      setControlNote,
    ] =
      useState("");

    const [
      controlAction,
      setControlAction,
    ] =
      useState<
        | "available"
        | "maintenance"
        | "archived"
        | null
      >(null);

    /*
     * ========================================================
     * FILTRES
     * ========================================================
     */

    const filtered =
      useMemo(() => {
        if (
          !properties
        ) {
          return [];
        }

        return properties.filter(
          (
            property: any,
          ) => {
            const q =
              search
                .trim()
                .toLowerCase();

            if (
              q &&
              !property.title
                .toLowerCase()
                .includes(
                  q,
                ) &&
              !property.city
                .toLowerCase()
                .includes(
                  q,
                ) &&
              !(
                property.commune ??
                ""
              )
                .toLowerCase()
                .includes(
                  q,
                ) &&
              !(
                property.reference ??
                ""
              )
                .toLowerCase()
                .includes(
                  q,
                )
            ) {
              return false;
            }

            if (
              filterType !==
                "__all__" &&
              property.listing_type !==
                filterType
            ) {
              return false;
            }

            if (
              filterStatus ===
              "__control__"
            ) {
              if (
                !property.control_required
              ) {
                return false;
              }
            } else if (
              filterStatus !==
                "__all__" &&
              property.status !==
                filterStatus
            ) {
              return false;
            }

            if (
              filterPropertyType !==
                "__all__" &&
              property.property_type !==
                filterPropertyType
            ) {
              return false;
            }

            if (
              filterCommune !==
                "__all__" &&
              property.commune !==
                filterCommune
            ) {
              return false;
            }

            return true;
          },
        );
      }, [
        properties,
        search,
        filterType,
        filterStatus,
        filterPropertyType,
        filterCommune,
      ]);

    const publishedCount =
      filtered.filter(
        (
          property: any,
        ) =>
          property.published,
      ).length;

    const controlCount =
      (
        properties ??
        []
      ).filter(
        (
          property: any,
        ) =>
          property.control_required,
      ).length;

    /*
     * ========================================================
     * OUVERTURE DU CONTRÔLE
     * ========================================================
     */

    const openControl =
      (
        property: PropertyRow,
      ) => {
        setControlProperty(
          property,
        );

        setControlNote(
          property.availability_note ??
            "",
        );

        setControlAction(
          null,
        );

        setControlOpen(
          true,
        );
      };

    const closeControl =
      () => {
        if (
          approveReavailability.isPending ||
          controlDecision.isPending
        ) {
          return;
        }

        setControlOpen(
          false,
        );

        setControlProperty(
          null,
        );

        setControlNote(
          "",
        );

        setControlAction(
          null,
        );
      };

    /*
     * ========================================================
     * VALIDATION DU CONTRÔLE
     * ========================================================
     */

    const handleControlDecision =
      async (
        action:
          | "available"
          | "maintenance"
          | "archived",
      ) => {
        if (
          !controlProperty
        ) {
          return;
        }

        setControlAction(
          action,
        );

        try {
          if (
            action ===
            "available"
          ) {
            await approveReavailability.mutateAsync(
              {
                propertyId:
                  controlProperty.id,

                note:
                  controlNote,
              },
            );

            toast.success(
              "Contrôle validé. Le bien est de nouveau disponible.",
            );
          }

          if (
            action ===
            "maintenance"
          ) {
            await controlDecision.mutateAsync(
              {
                propertyId:
                  controlProperty.id,

                decision:
                  "maintenance",

                note:
                  controlNote,
              },
            );

            toast.success(
              "Bien placé en maintenance.",
            );
          }

          if (
            action ===
            "archived"
          ) {
            await controlDecision.mutateAsync(
              {
                propertyId:
                  controlProperty.id,

                decision:
                  "archived",

                note:
                  controlNote,
              },
            );

            toast.success(
              "Bien archivé et retiré de la commercialisation.",
            );
          }

          setControlOpen(
            false,
          );

          setControlProperty(
            null,
          );

          setControlNote(
            "",
          );

          setControlAction(
            null,
          );
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ??
              "Impossible d'enregistrer la décision.",
          );

          setControlAction(
            null,
          );
        }
      };

    /*
     * ========================================================
     * PUBLICATION CLASSIQUE
     * ========================================================
     */

    const handleTogglePublish =
      (
        property: PropertyRow,
      ) => {
        /*
         * Les statuts métier ne doivent
         * jamais être écrasés par
         * Publier/Dépublier.
         */
        if (
          ![
            "draft",
            "published",
          ].includes(
            property.status,
          )
        ) {
          toast.error(
            "Le statut de ce bien est piloté par son workflow métier.",
          );

          return;
        }

        togglePublish.mutate(
          {
            id:
              property.id,

            published:
              !property.published,
          },

          {
            onSuccess:
              () =>
                toast.success(
                  property.published
                    ? "Bien dépublié"
                    : "Bien publié",
                ),
          },
        );
      };

    return (
      <PageShell
        title="Biens immobiliers"
        subtitle="Gestion de l'inventaire des biens"
        actions={
          <Button
            onClick={() => {
              setEditId(
                undefined,
              );

              setFormOpen(
                true,
              );
            }}
            variant="premium"
          >
            <Plus className="h-4 w-4" />

            Ajouter un bien
          </Button>
        }
      >
        {/* =================================================== */}
        {/* FILTRES                                             */}
        {/* =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          className="premium-card p-4 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder="Rechercher par titre, référence, ville ou commune..."
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
                className="pl-9 h-10"
              />
            </div>

            <Select
              value={
                filterType
              }
              onValueChange={
                setFilterType
              }
            >
              <SelectTrigger className="md:w-40 h-10">
                <SelectValue placeholder="Type d'offre" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Toutes les offres
                </SelectItem>

                {Object.entries(
                  listingTypeLabels,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <SelectItem
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {
                        label
                      }
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            <Select
              value={
                filterPropertyType
              }
              onValueChange={
                setFilterPropertyType
              }
            >
              <SelectTrigger className="md:w-40 h-10">
                <SelectValue placeholder="Type de bien" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Tous les biens
                </SelectItem>

                {Object.entries(
                  propertyTypeLabels,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <SelectItem
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {
                        label
                      }
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            <Select
              value={
                filterCommune
              }
              onValueChange={
                setFilterCommune
              }
            >
              <SelectTrigger className="md:w-36 h-10">
                <SelectValue placeholder="Commune" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Toutes
                </SelectItem>

                {conakryCommunes.map(
                  (
                    commune,
                  ) => (
                    <SelectItem
                      key={
                        commune
                      }
                      value={
                        commune
                      }
                    >
                      {
                        commune
                      }
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            <Select
              value={
                filterStatus
              }
              onValueChange={
                setFilterStatus
              }
            >
              <SelectTrigger className="md:w-44 h-10">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Tous
                </SelectItem>

                <SelectItem value="__control__">
                  À contrôler
                </SelectItem>

                {Object.entries(
                  propertyStatusLabels,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <SelectItem
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {
                        label
                      }
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {filtered.length >
            0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
              <span>
                {
                  filtered.length
                }{" "}
                bien
                {filtered.length >
                1
                  ? "s"
                  : ""}
              </span>

              <span>
                {
                  publishedCount
                }{" "}
                publié
                {publishedCount >
                1
                  ? "s"
                  : ""}{" "}
                sur le site
              </span>

              {controlCount >
                0 && (
                <span className="font-medium text-warning flex items-center gap-1">
                  <ClipboardCheck className="h-3.5 w-3.5" />

                  {
                    controlCount
                  }{" "}
                  à contrôler
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* =================================================== */}
        {/* TABLEAU                                             */}
        {/* =================================================== */}

        {isLoading ? (
          <TableSkeleton
            rows={5}
            columns={8}
          />
        ) : filtered.length ===
          0 ? (
          <EmptyState
            icon={Home}
            title="Aucun bien trouvé"
            description={
              search ||
              filterType !==
                "__all__" ||
              filterStatus !==
                "__all__"
                ? "Essayez de modifier vos filtres."
                : "Ajoutez votre premier bien immobilier."
            }
          />
        ) : (
          <div className="premium-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">
                    Bien
                  </TableHead>

                  <TableHead className="font-semibold">
                    Type
                  </TableHead>

                  <TableHead className="font-semibold">
                    Offre
                  </TableHead>

                  <TableHead className="font-semibold">
                    Prix / charges
                  </TableHead>

                  <TableHead className="font-semibold">
                    Localisation
                  </TableHead>

                  <TableHead className="font-semibold">
                    Dispo.
                  </TableHead>

                  <TableHead className="font-semibold">
                    Statut
                  </TableHead>

                  <TableHead className="text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map(
                  (
                    property: any,
                    index,
                  ) => {
                    const cover =
                      property.images
                        ?.slice()
                        .sort(
                          (
                            a: any,
                            b: any,
                          ) =>
                            a.position -
                            b.position,
                        )?.[0];

                    const needsControl =
                      Boolean(
                        property.control_required,
                      );

                    const canTogglePublish =
                      [
                        "draft",
                        "published",
                      ].includes(
                        property.status,
                      );

                    return (
                      <motion.tr
                        key={
                          property.id
                        }
                        initial={{
                          opacity: 0,
                        }}
                        animate={{
                          opacity: 1,
                        }}
                        transition={{
                          delay:
                            index *
                            0.02,
                        }}
                        className={
                          needsControl
                            ? "group bg-warning/5 hover:bg-warning/10 transition-colors"
                            : "group hover:bg-muted/30 transition-colors"
                        }
                      >
                        {/* BIEN */}

                        <TableCell>
                          <div className="flex items-center gap-3">
                            {cover ? (
                              <img
                                src={
                                  cover.url
                                }
                                alt={
                                  property.title
                                }
                                className="h-10 w-10 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Home className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}

                            <div>
                              <p className="font-medium text-sm flex items-center gap-1.5">
                                {
                                  property.title
                                }

                                {property.furnished && (
                                  <span title="Meublé">
                                    <Armchair className="h-3.5 w-3.5 text-secondary" />
                                  </span>
                                )}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {property.reference
                                  ? `${property.reference} · `
                                  : ""}

                                {Number(
                                  property.surface,
                                )}{" "}
                                m² ·{" "}
                                {
                                  property.rooms
                                }{" "}
                                pcs ·{" "}
                                {
                                  property.bedrooms
                                }{" "}
                                ch

                                {property.floor !==
                                  null
                                  ? ` · étage ${property.floor}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* TYPE */}

                        <TableCell className="text-sm">
                          {propertyTypeLabels[
                            property
                              .property_type
                          ] ??
                            property.property_type}
                        </TableCell>

                        {/* OFFRE */}

                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs font-medium"
                          >
                            {listingTypeLabels[
                              property
                                .listing_type
                            ] ??
                              property.listing_type}
                          </Badge>
                        </TableCell>

                        {/* PRIX */}

                        <TableCell className="text-sm">
                          <p className="font-semibold">
                            {formatMoney(
                              property.price,
                              property.currency,
                            )}
                          </p>

                          {Number(
                            property.charges,
                          ) >
                            0 && (
                            <p className="text-xs text-muted-foreground">
                              +{" "}
                              {formatMoney(
                                property.charges,
                                property.currency,
                              )}{" "}
                              charges
                            </p>
                          )}
                        </TableCell>

                        {/* LOCALISATION */}

                        <TableCell className="text-sm">
                          <p>
                            {
                              property.city
                            }
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {[
                              property.commune,
                              property.district,
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(
                                " · ",
                              ) ||
                              "—"}
                          </p>
                        </TableCell>

                        {/* DISPONIBILITÉ */}

                        <TableCell className="text-xs text-muted-foreground">
                          {needsControl ? (
                            <div className="space-y-1">
                              <span className="font-medium text-warning">
                                Contrôle requis
                              </span>

                              {property.availability_note && (
                                <p
                                  className="max-w-[180px] truncate"
                                  title={
                                    property.availability_note
                                  }
                                >
                                  {
                                    property.availability_note
                                  }
                                </p>
                              )}
                            </div>
                          ) : property.available_from ? (
                            formatDate(
                              property.available_from,
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        {/* STATUT */}

                        <TableCell>
                          {needsControl &&
                          property.status ===
                            "unavailable" ? (
                            <Badge className="bg-warning/15 text-warning text-xs border-0">
                              <ClipboardCheck className="h-3 w-3 mr-1" />

                              À contrôler
                            </Badge>
                          ) : (
                            <Badge
                              className={`${statusClass[
                                property
                                  .status
                              ] ?? ""} text-xs border-0`}
                            >
                              {propertyStatusLabels[
                                property
                                  .status
                              ] ??
                                property.status}
                            </Badge>
                          )}
                        </TableCell>

                        {/* ACTIONS */}

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {needsControl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() =>
                                  openControl(
                                    property,
                                  )
                                }
                              >
                                <ClipboardCheck className="h-3.5 w-3.5" />

                                Effectuer le contrôle
                              </Button>
                            )}

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={
                                  !canTogglePublish
                                }
                                onClick={() =>
                                  handleTogglePublish(
                                    property,
                                  )
                                }
                                title={
                                  canTogglePublish
                                    ? property.published
                                      ? "Dépublier"
                                      : "Publier"
                                    : "Statut géré par le workflow métier"
                                }
                              >
                                {property.published ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye
                                    className={`h-4 w-4 ${
                                      canTogglePublish
                                        ? "text-success"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditId(
                                    property.id,
                                  );

                                  setFormOpen(
                                    true,
                                  );
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  deleteProp.mutate(
                                    property.id,
                                    {
                                      onSuccess:
                                        () =>
                                          toast.success(
                                            "Bien supprimé",
                                          ),
                                    },
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  },
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* =================================================== */}
        {/* FORMULAIRE BIEN                                     */}
        {/* =================================================== */}

        <PropertyFormDialog
          open={
            formOpen
          }
          onOpenChange={
            setFormOpen
          }
          propertyId={
            editId
          }
        />

        {/* =================================================== */}
        {/* DIALOG CONTRÔLE POST-LOCATION                       */}
        {/* =================================================== */}

        <Dialog
          open={
            controlOpen
          }
          onOpenChange={(
            value,
          ) => {
            if (
              !value
            ) {
              closeControl();
            }
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="h-5 w-5 text-warning" />
                </div>

                <div>
                  <DialogTitle>
                    Contrôle du bien
                  </DialogTitle>

                  <DialogDescription className="mt-1">
                    Décidez de la remise en commercialisation après la fin du bail.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {controlProperty && (
              <div className="space-y-5 pt-2">
                {/* BIEN */}

                <div className="rounded-xl border p-4">
                  <p className="font-semibold">
                    {
                      controlProperty.title
                    }
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    {[
                      controlProperty.commune,
                      controlProperty.district,
                      controlProperty.city,
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(
                        " · ",
                      )}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="bg-warning/15 text-warning border-0">
                      <AlertTriangle className="h-3 w-3 mr-1" />

                      À contrôler
                    </Badge>
                  </div>

                  {controlProperty.availability_note && (
                    <p className="text-sm text-muted-foreground mt-3 rounded-lg bg-muted/60 p-3">
                      {
                        controlProperty.availability_note
                      }
                    </p>
                  )}
                </div>

                {/* NOTE */}

                <div className="space-y-1.5">
                  <Label>
                    Compte rendu du contrôle
                  </Label>

                  <Textarea
                    rows={4}
                    value={
                      controlNote
                    }
                    onChange={(
                      event,
                    ) =>
                      setControlNote(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="État du logement, réparations éventuelles, décision du propriétaire..."
                  />

                  <p className="text-[11px] text-muted-foreground">
                    Cette note sera conservée dans le suivi du bien.
                  </p>
                </div>

                {/* CHOIX */}

                <div className="grid gap-3">
                  <Button
                    className="w-full justify-start h-auto py-3"
                    onClick={() =>
                      void handleControlDecision(
                        "available",
                      )
                    }
                    disabled={
                      approveReavailability.isPending ||
                      controlDecision.isPending
                    }
                  >
                    {controlAction ===
                      "available" &&
                    approveReavailability.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    )}

                    <span className="text-left">
                      <span className="block">
                        Remettre disponible
                      </span>

                      <span className="block text-[11px] font-normal opacity-80">
                        Le bien est conforme et peut être recommercialisé.
                      </span>
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() =>
                      void handleControlDecision(
                        "maintenance",
                      )
                    }
                    disabled={
                      approveReavailability.isPending ||
                      controlDecision.isPending
                    }
                  >
                    {controlAction ===
                      "maintenance" &&
                    controlDecision.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <Wrench className="h-4 w-4 shrink-0 text-orange-600" />
                    )}

                    <span className="text-left">
                      <span className="block">
                        Maintenance
                      </span>

                      <span className="block text-[11px] font-normal text-muted-foreground">
                        Des travaux sont nécessaires avant toute nouvelle location.
                      </span>
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() =>
                      void handleControlDecision(
                        "archived",
                      )
                    }
                    disabled={
                      approveReavailability.isPending ||
                      controlDecision.isPending
                    }
                  >
                    {controlAction ===
                      "archived" &&
                    controlDecision.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <Archive className="h-4 w-4 shrink-0 text-destructive" />
                    )}

                    <span className="text-left">
                      <span className="block">
                        Archiver
                      </span>

                      <span className="block text-[11px] font-normal text-muted-foreground">
                        Le bien est retiré de la commercialisation.
                      </span>
                    </span>
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={
                      closeControl
                    }
                    disabled={
                      approveReavailability.isPending ||
                      controlDecision.isPending
                    }
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageShell>
    );
  };

export default PropertiesPage;