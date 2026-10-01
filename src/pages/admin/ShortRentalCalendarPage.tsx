import {
  useMemo,
  useState,
} from "react";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";

import { fr } from "date-fns/locale";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

import PageShell from "@/components/PageShell";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import TableSkeleton from "@/components/admin/TableSkeleton";

import PropertyBlockDialog from "@/components/admin/short-rental/PropertyBlockDialog";

import { useProperties } from "@/hooks/use-properties";

import {
  PropertyBlock,
  useDeletePropertyBlock,
  usePropertyBlocks,
} from "@/hooks/use-property-blocks";

import {
  PropertyRatePeriod,
  usePropertyRatePeriods,
} from "@/hooks/use-property-rate-periods";

import { supabase } from "@/integrations/supabase/client";

import { useQuery } from "@tanstack/react-query";

const db = supabase as any;

type CalendarBooking = {
  id: string;
  property_id: string;

  reference: string;

  guest_name: string;

  check_in: string;
  check_out: string;

  status:
    | "request"
    | "option"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled";

  option_expires_at:
    | string
    | null;
};

const BLOCK_LABELS: Record<string, string> = {
  manual: "Blocage manuel",
  maintenance: "Maintenance",
  owner_use: "Usage propriétaire",
  administrative: "Administratif",
  external_booking: "Réservation externe",
  other: "Autre",
};

const bookingBlocksDate = (
  booking: CalendarBooking,
) => {
  if (
    booking.status === "confirmed" ||
    booking.status === "in_progress"
  ) {
    return true;
  }

  if (
    booking.status === "option" &&
    booking.option_expires_at
  ) {
    return (
      new Date(
        booking.option_expires_at,
      ).getTime() > Date.now()
    );
  }

  return false;
};

const dateToIso = (
  date: Date,
) =>
  format(
    date,
    "yyyy-MM-dd",
  );

const isDateInsideRange = (
  date: string,
  start: string,
  end: string,
) =>
  date >= start &&
  date < end;

function useCalendarBookings(
  propertyId?: string,
) {
  return useQuery({
    queryKey: [
      "short-rental-calendar-bookings",
      propertyId,
    ],

    enabled: Boolean(
      propertyId,
    ),

    queryFn: async () => {
      if (!propertyId) {
        return [];
      }

      const {
        data,
        error,
      } = await db
        .from("bookings")
        .select(
          `
            id,
            property_id,
            reference,
            guest_name,
            check_in,
            check_out,
            status,
            option_expires_at
          `,
        )
        .eq(
          "property_id",
          propertyId,
        )
        .neq(
          "status",
          "cancelled",
        )
        .order(
          "check_in",
          {
            ascending: true,
          },
        );

      if (error) {
        throw error;
      }

      return (
        data ?? []
      ) as CalendarBooking[];
    },
  });
}

export default function ShortRentalCalendarPage() {
  const {
    data: properties,
    isLoading:
      propertiesLoading,
  } = useProperties({
    listing_type:
      "short_rental",
  });

  const [
    selectedPropertyId,
    setSelectedPropertyId,
  ] = useState<
    string | undefined
  >(undefined);

  const effectivePropertyId =
    selectedPropertyId ??
    properties?.[0]?.id;

  const selectedProperty =
    properties?.find(
      (property) =>
        property.id ===
        effectivePropertyId,
    );

  const {
    data: blocks,
    isLoading:
      blocksLoading,
    error:
      blocksError,
  } =
    usePropertyBlocks(
      effectivePropertyId,
    );

  const {
    data: rates,
    isLoading:
      ratesLoading,
  } =
    usePropertyRatePeriods(
      effectivePropertyId,
    );

  const {
    data: bookings,
    isLoading:
      bookingsLoading,
    error:
      bookingsError,
  } =
    useCalendarBookings(
      effectivePropertyId,
    );

  const deleteBlock =
    useDeletePropertyBlock();

  const [
    currentMonth,
    setCurrentMonth,
  ] =
    useState<Date>(
      new Date(),
    );

  const [
    blockDialogOpen,
    setBlockDialogOpen,
  ] = useState(false);

  const [
    editingBlock,
    setEditingBlock,
  ] =
    useState<PropertyBlock | null>(
      null,
    );

  const [
    defaultStartDate,
    setDefaultStartDate,
  ] =
    useState<
      string | undefined
    >(undefined);

  const [
    defaultEndDate,
    setDefaultEndDate,
  ] =
    useState<
      string | undefined
    >(undefined);

  const monthStart =
    startOfMonth(
      currentMonth,
    );

  const monthEnd =
    endOfMonth(
      currentMonth,
    );

  const monthDays =
    useMemo(
      () =>
        eachDayOfInterval({
          start:
            monthStart,
          end:
            monthEnd,
        }),
      [
        monthStart.getTime(),
        monthEnd.getTime(),
      ],
    );

  const firstDayOffset =
    (
      getDay(
        monthStart,
      ) +
      6
    ) %
    7;

  const calendarCells =
    useMemo(
      () => [
        ...Array.from(
          {
            length:
              firstDayOffset,
          },
          () => null,
        ),

        ...monthDays,
      ],
      [
        firstDayOffset,
        monthDays,
      ],
    );

  const openCreateBlock =
    (
      day?: Date,
    ) => {
      if (
        !effectivePropertyId
      ) {
        toast.error(
          "Aucun logement sélectionné",
        );

        return;
      }

      setEditingBlock(
        null,
      );

      if (day) {
        const start =
          dateToIso(day);

        const nextDay =
          new Date(day);

        nextDay.setDate(
          nextDay.getDate() +
            1,
        );

        setDefaultStartDate(
          start,
        );

        setDefaultEndDate(
          dateToIso(
            nextDay,
          ),
        );
      } else {
        setDefaultStartDate(
          undefined,
        );

        setDefaultEndDate(
          undefined,
        );
      }

      setBlockDialogOpen(
        true,
      );
    };

  const openEditBlock =
    (
      block: PropertyBlock,
    ) => {
      setEditingBlock(
        block,
      );

      setDefaultStartDate(
        undefined,
      );

      setDefaultEndDate(
        undefined,
      );

      setBlockDialogOpen(
        true,
      );
    };

  const handleDeleteBlock =
    async (
      block: PropertyBlock,
    ) => {
      const confirmed =
        window.confirm(
          `Supprimer ce blocage du ${block.start_date} au ${block.end_date} ?`,
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteBlock.mutateAsync(
          block.id,
        );

        toast.success(
          "Blocage supprimé",
        );
      } catch (
        error: any
      ) {
        console.error(
          error,
        );

        toast.error(
          error?.message ??
            "Impossible de supprimer le blocage",
        );
      }
    };

  const isLoading =
    propertiesLoading ||
    blocksLoading ||
    ratesLoading ||
    bookingsLoading;

  return (
    <PageShell
      title="Calendrier courte durée"
      subtitle="Disponibilités, réservations, blocages et périodes tarifaires"
      actions={
        <Button
          onClick={() =>
            openCreateBlock()
          }
          disabled={
            !effectivePropertyId
          }
        >
          <Plus className="mr-2 h-4 w-4" />

          Bloquer une période
        </Button>
      }
    >
      <div className="premium-card mb-6 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full max-w-md">
            <p className="mb-2 text-sm font-medium">
              Logement
            </p>

            <Select
              value={
                effectivePropertyId
              }
              onValueChange={
                setSelectedPropertyId
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un logement" />
              </SelectTrigger>

              <SelectContent>
                {(properties ??
                  []).map(
                  (
                    property,
                  ) => (
                    <SelectItem
                      key={
                        property.id
                      }
                      value={
                        property.id
                      }
                    >
                      {
                        property.title
                      }
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border bg-background" />
              Disponible
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-primary" />
              Réservation
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-destructive" />
              Bloqué
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-muted-foreground/40" />
              Tarif saisonnier
            </div>
          </div>
        </div>
      </div>

      {(blocksError ||
        bookingsError) && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de
          charger toutes les
          données du calendrier.
        </div>
      )}

      {isLoading ? (
        <TableSkeleton
          rows={6}
          columns={7}
        />
      ) : !effectivePropertyId ? (
        <div className="premium-card p-10 text-center">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

          <p className="font-medium">
            Aucun logement
            courte durée
          </p>
        </div>
      ) : (
        <>
          <div className="premium-card overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentMonth(
                    subMonths(
                      currentMonth,
                      1,
                    ),
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center">
                <p className="text-lg font-semibold capitalize">
                  {format(
                    currentMonth,
                    "MMMM yyyy",
                    {
                      locale: fr,
                    },
                  )}
                </p>

                <p className="text-xs text-muted-foreground">
                  {selectedProperty?.title}
                </p>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentMonth(
                    addMonths(
                      currentMonth,
                      1,
                    ),
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
              {[
                "Lun",
                "Mar",
                "Mer",
                "Jeu",
                "Ven",
                "Sam",
                "Dim",
              ].map(
                (day) => (
                  <div
                    key={day}
                    className="p-3"
                  >
                    {day}
                  </div>
                ),
              )}
            </div>

            <div className="grid grid-cols-7">
              {calendarCells.map(
                (
                  day,
                  index,
                ) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-32 border-b border-r bg-muted/10"
                      />
                    );
                  }

                  const iso =
                    dateToIso(
                      day,
                    );

                  const dayBlocks =
                    (
                      blocks ??
                      []
                    ).filter(
                      (
                        block,
                      ) =>
                        isDateInsideRange(
                          iso,
                          block.start_date,
                          block.end_date,
                        ),
                    );

                  const dayBookings =
                    (
                      bookings ??
                      []
                    ).filter(
                      (
                        booking,
                      ) =>
                        bookingBlocksDate(
                          booking,
                        ) &&
                        isDateInsideRange(
                          iso,
                          booking.check_in,
                          booking.check_out,
                        ),
                    );

                  const dayRates =
                    (
                      rates ??
                      []
                    )
                      .filter(
                        (
                          rate,
                        ) =>
                          rate.active &&
                          isDateInsideRange(
                            iso,
                            rate.start_date,
                            rate.end_date,
                          ),
                      )
                      .sort(
                        (
                          a,
                          b,
                        ) =>
                          b.priority -
                          a.priority,
                      );

                  const activeRate:
                    | PropertyRatePeriod
                    | undefined =
                    dayRates[0];

                  return (
                    <button
                      type="button"
                      key={iso}
                      onClick={() =>
                        openCreateBlock(
                          day,
                        )
                      }
                      className="min-h-32 border-b border-r p-2 text-left transition-colors hover:bg-muted/30"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={
                            isSameDay(
                              day,
                              new Date(),
                            )
                              ? "flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                              : "text-sm font-medium"
                          }
                        >
                          {format(
                            day,
                            "d",
                          )}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {activeRate && (
                          <div className="truncate rounded bg-muted px-1.5 py-1 text-[10px]">
                            {activeRate.name}
                          </div>
                        )}

                        {dayBookings.map(
                          (
                            booking,
                          ) => (
                            <div
                              key={
                                booking.id
                              }
                              className="truncate rounded bg-primary px-1.5 py-1 text-[10px] text-primary-foreground"
                              title={`${booking.reference} - ${booking.guest_name}`}
                            >
                              {booking.reference}
                            </div>
                          ),
                        )}

                        {dayBlocks.map(
                          (
                            block,
                          ) => (
                            <div
                              key={
                                block.id
                              }
                              className="truncate rounded bg-destructive px-1.5 py-1 text-[10px] text-destructive-foreground"
                              title={
                                block.reason ??
                                BLOCK_LABELS[
                                  block.block_type
                                ]
                              }
                            >
                              {BLOCK_LABELS[
                                block.block_type
                              ] ??
                                "Bloqué"}
                            </div>
                          ),
                        )}
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="premium-card p-5">
              <h3 className="font-semibold">
                Blocages du logement
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Les blocages rendent
                réellement les dates
                indisponibles.
              </p>

              <div className="mt-4 space-y-3">
                {!blocks ||
                blocks.length ===
                  0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun blocage.
                  </p>
                ) : (
                  blocks.map(
                    (
                      block,
                    ) => (
                      <div
                        key={
                          block.id
                        }
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {BLOCK_LABELS[
                              block.block_type
                            ] ??
                              block.block_type}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {
                              block.start_date
                            }{" "}
                            →{" "}
                            {
                              block.end_date
                            }
                          </p>

                          {block.reason && (
                            <p className="mt-1 text-xs">
                              {
                                block.reason
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              openEditBlock(
                                block,
                              )
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={
                              deleteBlock.isPending
                            }
                            onClick={() =>
                              handleDeleteBlock(
                                block,
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>

            <div className="premium-card p-5">
              <h3 className="font-semibold">
                Lecture du calendrier
              </h3>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <Badge variant="outline">
                    Tarif
                  </Badge>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Une période
                    tarifaire modifie
                    le prix mais ne
                    bloque jamais le
                    logement.
                  </p>
                </div>

                <div>
                  <Badge>
                    Réservation
                  </Badge>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Confirmée ou en
                    cours = dates
                    indisponibles.
                  </p>
                </div>

                <div>
                  <Badge variant="destructive">
                    Blocage
                  </Badge>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Maintenance,
                    propriétaire,
                    administratif,
                    réservation
                    externe ou
                    blocage manuel.
                  </p>
                </div>

                <div>
                  <Badge variant="outline">
                    Option
                  </Badge>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Une option ne
                    bloque les dates
                    que jusqu'à son
                    expiration.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <PropertyBlockDialog
            open={
              blockDialogOpen
            }
            onOpenChange={
              setBlockDialogOpen
            }
            propertyId={
              effectivePropertyId
            }
            propertyTitle={
              selectedProperty?.title
            }
            block={
              editingBlock
            }
            defaultStartDate={
              defaultStartDate
            }
            defaultEndDate={
              defaultEndDate
            }
          />
        </>
      )}
    </PageShell>
  );
}