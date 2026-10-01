import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";

import {
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  Home,
  ChevronLeft,
  ChevronRight,
  Star,
  Armchair,
  Globe,
  Video,
  Maximize,
  CalendarClock,
  Building2,
  Layers,
  CalendarDays,
  Users,
  ShieldCheck,
  WalletCards,
  CheckCircle2,
  Info,
  Send,
  Lock,
  Check,
} from "lucide-react";

import {
  useMarketplaceListing,
  useSimilarListings,
} from "@/hooks/use-marketplace";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import ContactPropertyForm from "@/components/public/ContactPropertyForm";
import ListingCard from "@/components/public/ListingCard";
import PanoramaViewer from "@/components/public/PanoramaViewer";

import MediaLightbox, {
  type MediaItem,
} from "@/components/public/MediaLightbox";

import FavoriteButton from "@/components/public/FavoriteButton";
import ShareActions from "@/components/public/ShareActions";

import {
  formatDate,
  formatMoney,
  listingTypeLabels,
  propertyTypeLabels,
} from "@/constants/real-estate";

import type { PropertyStatus } from "@/types/real-estate";

import {
  type PublicPaymentPlan,
  type ShortRentalQuote,
  useCreatePublicShortRentalBooking,
  usePublicShortRental,
} from "@/hooks/use-public-short-rental";

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDaysToKey = (value: string, days: number) => {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

const monthLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

const weekdayLabels = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

type CalendarBlockedRange = {
  start: string;
  end: string;
};

const AvailabilityCalendar = ({
  checkIn,
  checkOut,
  minDate,
  blockedRanges,
  onChange,
}: {
  checkIn: string;
  checkOut: string;
  minDate: string;
  blockedRanges: CalendarBlockedRange[];
  onChange: (checkIn: string, checkOut: string) => void;
}) => {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = checkIn ? parseDateKey(checkIn) : parseDateKey(minDate);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const isBlocked = (dateKey: string) =>
    blockedRanges.some(
      (range) => dateKey >= range.start && dateKey < range.end,
    );

  const periodContainsBlockedDate = (start: string, end: string) => {
    if (!start || !end || end <= start) return false;

    let cursor = start;
    while (cursor < end) {
      if (isBlocked(cursor)) return true;
      cursor = addDaysToKey(cursor, 1);
    }

    return false;
  };

  const handleDayClick = (dateKey: string) => {
    if (dateKey < minDate || isBlocked(dateKey)) return;

    if (!checkIn || checkOut || dateKey < checkIn) {
      onChange(dateKey, "");
      return;
    }

    if (dateKey === checkIn) return;

    if (periodContainsBlockedDate(checkIn, dateKey)) {
      onChange(dateKey, "");
      return;
    }

    onChange(checkIn, dateKey);
  };

  const monthDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const previousMonthDisabled = useMemo(() => {
    const min = parseDateKey(minDate);
    const minMonth = new Date(min.getFullYear(), min.getMonth(), 1);
    return visibleMonth <= minMonth;
  }, [minDate, visibleMonth]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          disabled={previousMonthDisabled}
          onClick={() =>
            setVisibleMonth(
              (current) =>
                new Date(current.getFullYear(), current.getMonth() - 1, 1),
            )
          }
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <p className="text-sm font-semibold capitalize text-slate-900">
          {monthLabelFormatter.format(visibleMonth)}
        </p>

        <button
          type="button"
          onClick={() =>
            setVisibleMonth(
              (current) =>
                new Date(current.getFullYear(), current.getMonth() + 1, 1),
            )
          }
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="flex h-7 items-center justify-center text-[11px] font-semibold text-slate-400"
          >
            {label}
          </div>
        ))}

        {monthDays.map((date) => {
          const dateKey = toDateKey(date);
          const currentMonth = date.getMonth() === visibleMonth.getMonth();
          const past = dateKey < minDate;
          const blocked = isBlocked(dateKey);
          const disabled = past || blocked;
          const start = dateKey === checkIn;
          const end = dateKey === checkOut;
          const between =
            Boolean(checkIn && checkOut) &&
            dateKey > checkIn &&
            dateKey < checkOut;
          const selected = start || end;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={disabled || !currentMonth}
              onClick={() => handleDayClick(dateKey)}
              title={
                blocked
                  ? "Date indisponible"
                  : past
                    ? "Date passée"
                    : undefined
              }
              className={[
                "flex h-9 items-center justify-center rounded-lg text-xs font-medium transition",
                !currentMonth ? "invisible" : "",
                disabled
                  ? "cursor-not-allowed bg-slate-100 text-slate-300 line-through"
                  : "text-slate-700 hover:bg-blue-50 hover:text-blue-700",
                between && !disabled
                  ? "rounded-none bg-blue-50 text-blue-700"
                  : "",
                selected && !disabled
                  ? "rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700 hover:text-white"
                  : "",
              ].join(" ")}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-slate-300 bg-white" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-600" />
          Sélectionné
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-slate-200" />
          Indisponible
        </span>
      </div>
    </div>
  );
};

const PublicShortRentalBookingCard = ({
  propertyId,
  propertyAvailable,
}: {
  propertyId: string;
  propertyAvailable: boolean;
}) => {
  const shortRental = usePublicShortRental(propertyId);
  const createBooking = useCreatePublicShortRentalBooking();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCountryOfResidence, setGuestCountryOfResidence] = useState("");
  const [guestSpecialRequest, setGuestSpecialRequest] = useState("");
  const [paymentPlan, setPaymentPlan] = useState<PublicPaymentPlan>("half");
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [quote, setQuote] = useState<ShortRentalQuote | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdReference, setCreatedReference] = useState<string | null>(null);

  const minDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const blockedRanges = useMemo<CalendarBlockedRange[]>(() => {
    const blocks = (shortRental.blocks ?? []) as Array<{
      start_date?: string;
      end_date?: string;
    }>;

    const bookings = (shortRental.blockingBookings ?? []) as Array<{
      check_in?: string;
      check_out?: string;
    }>;

    return [
      ...blocks
        .filter((block) => block.start_date && block.end_date)
        .map((block) => ({
          start: String(block.start_date),
          end: String(block.end_date),
        })),
      ...bookings
        .filter((booking) => booking.check_in && booking.check_out)
        .map((booking) => ({
          start: String(booking.check_in),
          end: String(booking.check_out),
        })),
    ];
  }, [shortRental.blocks, shortRental.blockingBookings]);

  const resetQuote = () => {
    setQuote(null);
    setFormError(null);
    setCreatedReference(null);
  };

  const handleCheckAvailability = () => {
    setFormError(null);
    setCreatedReference(null);

    try {
      const nextQuote = shortRental.calculateQuote(
        checkIn,
        checkOut,
        guestsCount,
      );
      setQuote(nextQuote);
    } catch (error: any) {
      setQuote(null);
      setFormError(error?.message ?? "Impossible de vérifier cette période.");
    }
  };

  const handleCreateBooking = async () => {
    setFormError(null);
    setCreatedReference(null);

    try {
      const currentQuote = shortRental.calculateQuote(
        checkIn,
        checkOut,
        guestsCount,
      );
      setQuote(currentQuote);

      const booking = await createBooking.mutateAsync({
        property_id: propertyId,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        guest_country_of_residence: guestCountryOfResidence,
        guest_special_request: guestSpecialRequest,
        guests_count: guestsCount,
        check_in: checkIn,
        check_out: checkOut,
        payment_plan: paymentPlan,
        conditions_accepted: conditionsAccepted,
        quote: currentQuote,
      });

      setCreatedReference(booking.reference ?? "Réservation enregistrée");
    } catch (error: any) {
      setFormError(error?.message ?? "Impossible d'enregistrer la réservation.");
    }
  };

  if (!propertyAvailable) {
    return (
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-6 text-white">
          <p className="text-sm font-medium text-blue-100">Location courte durée</p>
          <h2 className="mt-1 text-2xl font-display font-semibold">Réserver ce logement</h2>
        </div>
        <div className="p-6">
          <p className="font-semibold text-slate-900">Réservation indisponible</p>
          <p className="mt-1 text-sm text-slate-500">
            Ce logement n'est actuellement pas disponible à la réservation.
          </p>
        </div>
      </div>
    );
  }

  if (shortRental.isLoading) {
    return (
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-6 text-white">
          <p className="text-sm font-medium text-blue-100">Location courte durée</p>
          <h2 className="mt-1 text-2xl font-display font-semibold">Réserver ce logement</h2>
        </div>
        <div className="space-y-3 p-6">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (shortRental.error || !shortRental.settings) {
    return (
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-6 text-white">
          <p className="text-sm font-medium text-blue-100">Location courte durée</p>
          <h2 className="mt-1 text-2xl font-display font-semibold">Réserver ce logement</h2>
        </div>
        <div className="p-6">
          <p className="font-semibold text-slate-900">Réservation en ligne indisponible</p>
          <p className="mt-1 text-sm text-slate-500">
            La configuration courte durée de ce logement n'est pas accessible pour le moment.
          </p>
        </div>
      </div>
    );
  }

  const settings = shortRental.settings;
  const initialPaymentPercent = paymentPlan === "full" ? 100 : 50;
  const initialPaymentAmount = quote
    ? (quote.total_amount * initialPaymentPercent) / 100
    : 0;
  const canCheckAvailability = Boolean(checkIn && checkOut);
  const canSubmit = Boolean(
    quote &&
      guestName.trim() &&
      guestPhone.trim() &&
      guestEmail.trim() &&
      guestCountryOfResidence.trim() &&
      conditionsAccepted,
  );

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-6 py-6 text-white">
        <div className="absolute -right-5 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute right-8 top-3 h-16 w-16 rounded-full bg-white/5" />
        <div className="relative">
          <h2 className="text-2xl font-display font-semibold tracking-tight">
            Réserver ce logement
          </h2>
          <p className="mt-1 text-sm font-medium text-blue-100">
            Location courte durée
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <span className="text-sm text-slate-600">Tarif de base</span>
            <span className="font-semibold text-slate-950">
              {formatMoney(Number(settings.base_nightly_rate), settings.currency)} / nuit
            </span>
          </div>
          {Number(settings.cleaning_fee) > 0 && (
            <div className="flex items-center justify-between gap-4 pt-3 text-sm">
              <span className="text-slate-500">Frais de ménage</span>
              <span className="font-medium text-slate-800">
                {formatMoney(Number(settings.cleaning_fee), settings.currency)}
              </span>
            </div>
          )}
          {Number(settings.security_deposit) > 0 && (
            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-500">Caution séparée</span>
              <span className="font-medium text-slate-800">
                {formatMoney(Number(settings.security_deposit), settings.currency)}
              </span>
            </div>
          )}
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-950">Dates du séjour</h3>

          <AvailabilityCalendar
            checkIn={checkIn}
            checkOut={checkOut}
            minDate={minDate}
            blockedRanges={blockedRanges}
            onChange={(nextCheckIn, nextCheckOut) => {
              setCheckIn(nextCheckIn);
              setCheckOut(nextCheckOut);
              resetQuote();
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Arrivée
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {checkIn
                  ? parseDateKey(checkIn).toLocaleDateString("fr-FR")
                  : "À sélectionner"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Départ
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {checkOut
                  ? parseDateKey(checkOut).toLocaleDateString("fr-FR")
                  : "À sélectionner"}
              </p>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Voyageurs</span>
            <select
              value={guestsCount}
              onChange={(event) => {
                setGuestsCount(Number(event.target.value));
                resetQuote();
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              {Array.from(
                { length: Math.max(1, Number(settings.max_guests)) },
                (_, index) => index + 1,
              ).map((count) => (
                <option key={count} value={count}>
                  {count} voyageur{count > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
            onClick={handleCheckAvailability}
            disabled={!canCheckAvailability}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Vérifier les disponibilités
          </Button>
        </section>

        {formError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        {quote && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-950">Résumé du séjour</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Disponible
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Durée du séjour</span>
                <span className="font-medium text-slate-800">
                  {quote.nights_count} nuit{quote.nights_count > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Hébergement</span>
                <span className="font-medium text-slate-800">
                  {formatMoney(quote.accommodation_amount, quote.currency)}
                </span>
              </div>
              {quote.cleaning_fee > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Frais de ménage</span>
                  <span className="font-medium text-slate-800">
                    {formatMoney(quote.cleaning_fee, quote.currency)}
                  </span>
                </div>
              )}

              <div className="my-3 border-t border-emerald-200" />

              <div className="flex justify-between gap-4 font-semibold text-slate-950">
                <span>Sous-total</span>
                <span>{formatMoney(quote.total_amount, quote.currency)}</span>
              </div>

              {quote.security_deposit > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Caution séparée</span>
                  <span className="font-medium text-slate-800">
                    {formatMoney(quote.security_deposit, quote.currency)}
                  </span>
                </div>
              )}

              <div className="my-3 border-t border-emerald-200" />

              <div className="flex items-end justify-between gap-4">
                <span className="font-semibold text-emerald-800">Total du séjour</span>
                <span className="text-xl font-bold text-emerald-700">
                  {formatMoney(quote.total_amount, quote.currency)}
                </span>
              </div>
            </div>

            {quote.security_deposit > 0 && (
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-emerald-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                La caution est séparée et n'est pas incluse dans le total du séjour.
              </p>
            )}
          </div>
        )}

        {quote && (
          <div className="space-y-5 border-t border-slate-100 pt-5">
            <section>
              <h3 className="font-semibold text-slate-950">Vos coordonnées</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Indiquez votre nom, votre téléphone, votre e-mail et votre pays de résidence.
              </p>
            </section>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Nom complet <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Nom du voyageur"
                autoComplete="name"
                maxLength={200}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  Téléphone <span className="text-red-500">*</span>
                </span>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="+224…"
                  autoComplete="tel"
                  maxLength={50}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  E-mail <span className="text-red-500">*</span>
                </span>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="nom@email.com"
                  autoComplete="email"
                  maxLength={320}
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Pays de résidence <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={guestCountryOfResidence}
                onChange={(event) => setGuestCountryOfResidence(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Ex. Guinée"
                autoComplete="country-name"
                maxLength={100}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Demande spéciale{" "}
                <span className="font-normal text-slate-400">(facultatif)</span>
              </span>
              <textarea
                value={guestSpecialRequest}
                onChange={(event) => setGuestSpecialRequest(event.target.value)}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Ex. arrivée tardive, besoin particulier ou information utile pour l'accueil…"
                rows={4}
                maxLength={2000}
              />
              <span className="block text-right text-[11px] text-slate-400">
                {guestSpecialRequest.length}/2000
              </span>
            </label>

            <section className="space-y-2.5">
              <p className="text-sm font-semibold text-slate-950">Plan de paiement</p>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                  paymentPlan === "half"
                    ? "border-blue-500 bg-blue-50/70 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment-plan"
                  checked={paymentPlan === "half"}
                  onChange={() => setPaymentPlan("half")}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">
                    50 % à la confirmation
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Solde à régler avant le check-in.
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {formatMoney(quote.total_amount / 2, quote.currency)}
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                  paymentPlan === "full"
                    ? "border-amber-400 bg-amber-50/70 shadow-[0_0_0_3px_rgba(245,158,11,0.08)]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment-plan"
                  checked={paymentPlan === "full"}
                  onChange={() => setPaymentPlan("full")}
                  className="h-4 w-4 accent-amber-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">
                    100 % à la confirmation
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Règlement intégral du séjour.
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                  {formatMoney(quote.total_amount, quote.currency)}
                </span>
              </label>
            </section>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="space-y-1 text-xs leading-relaxed text-amber-950">
                  <p className="font-semibold">Annulation gratuite jusqu'à 72 h avant l'arrivée.</p>
                  <p>À moins de 72 h : pénalité de 50 % du montant total du séjour.</p>
                  <p className="font-semibold">
                    Montant prévu à la confirmation : {formatMoney(initialPaymentAmount, quote.currency)} ({initialPaymentPercent} %)
                  </p>
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={conditionsAccepted}
                onChange={(event) => setConditionsAccepted(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-blue-600"
              />
              <span className="leading-relaxed">
                J'accepte les <span className="font-medium text-blue-700">conditions</span> de réservation, de paiement et d'annulation affichées ci-dessus.
              </span>
            </label>

            <Button
              type="button"
              className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] transition hover:from-blue-800 hover:to-blue-700"
              disabled={createBooking.isPending || !canSubmit}
              onClick={handleCreateBooking}
            >
              <Send className="mr-2 h-4 w-4" />
              {createBooking.isPending
                ? "Enregistrement…"
                : "Envoyer ma demande de réservation"}
            </Button>

            <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Vos données sont sécurisées et confidentielles
            </p>

            {createdReference && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-900">Demande enregistrée</p>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-800/80">
                      Référence : {createdReference}. La demande doit encore être confirmée par l'agence.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/*
 * La partie fiche bien ci-dessous reste strictement identique
 * au fichier fourni par l'utilisateur.
 */
const PropertyDetailPage = () => {
  const { id: slug } = useParams<{ id: string }>();

  const { data: listing, isLoading } = useMarketplaceListing(slug ?? "");

  const { data: similar } = useSimilarListings({
    propertyId: listing?.property_id,
    listingType: listing?.listing_type,
    propertyType: listing?.property_type,
    commune: listing?.commune ?? undefined,
    city: listing?.city,
    limit: 3,
  });

  const [selectedImg, setSelectedImg] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = listing?.images ?? [];
  const videos = listing?.videos ?? [];

  const panoramas = images.filter((img: any) => img.is_panorama);
  const regularImages = images.filter((img: any) => !img.is_panorama);
  const standardVideos = videos.filter(
    (video: any) => video.video_type === "standard",
  );
  const tour360Videos = videos.filter(
    (video: any) => video.video_type === "tour_360",
  );

  const similarFiltered = similar ?? [];

  const propertyStatus =
    ((listing as any)?.status ?? "published") as PropertyStatus;

  const isAvailable = propertyStatus === "published";
  const isShortRental = listing?.listing_type === "short_rental";

  const publicShortRental = usePublicShortRental(
    isShortRental ? listing?.property_id : undefined,
  );

  const shortRentalNightlyRate = Number(
    publicShortRental.settings?.base_nightly_rate ??
      (listing as any)?.base_nightly_rate ??
      (listing as any)?.nightly_price ??
      listing?.price ??
      0,
  );

  const shortRentalDeposit = Number(
    publicShortRental.settings?.security_deposit ??
      (listing as any)?.short_rental_deposit ??
      (listing as any)?.deposit ??
      0,
  );

  const shortRentalCleaningFee = Number(
    publicShortRental.settings?.cleaning_fee ??
      (listing as any)?.cleaning_fee ??
      0,
  );

  const shortRentalMaxGuests = Number(
    publicShortRental.settings?.max_guests ??
      (listing as any)?.max_guests ??
      0,
  );

  const shortRentalCurrency =
    publicShortRental.settings?.currency ?? listing?.currency;

  const mediaItems: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];

    regularImages.forEach((img: any) => {
      items.push({
        type: "image",
        url: img.url,
        alt: img.alt,
      });
    });

    standardVideos.forEach((video: any) => {
      items.push({
        type: "video",
        url: video.url,
        title: video.title,
      });
    });

    panoramas.forEach((panorama: any) => {
      items.push({
        type: "panorama",
        url: panorama.url,
      });
    });

    tour360Videos.forEach((video: any) => {
      items.push({
        type: "video",
        url: video.url,
        title: video.title,
      });
    });

    return items;
  }, [regularImages, standardVideos, panoramas, tour360Videos]);

  const openLightbox = (mediaType: string, indexInGroup: number) => {
    let offset = 0;

    if (mediaType === "image") {
      offset = 0;
    } else if (mediaType === "video") {
      offset = regularImages.length;
    } else if (mediaType === "panorama") {
      offset = regularImages.length + standardVideos.length;
    } else if (mediaType === "tour360") {
      offset =
        regularImages.length +
        standardVideos.length +
        panoramas.length;
    }

    setLightboxIndex(offset + indexInGroup);
  };

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_405px]">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-[16/9] bg-muted rounded-2xl animate-pulse" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square bg-muted rounded-xl animate-pulse"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-80 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container py-20 text-center">
        <Home className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">Bien introuvable.</p>
        <Link
          to="/"
          className="text-primary font-medium text-sm mt-4 inline-block hover:underline"
        >
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/40">
      <div className="container py-7">
        {lightboxIndex !== null && mediaItems.length > 0 && (
          <MediaLightbox
            items={mediaItems}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <Link
            to={isShortRental ? "/short-rental" : "/"}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {isShortRental
              ? "Retour aux locations courte durée"
              : "Retour aux annonces"}
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_405px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0 space-y-6"
          >
            {regularImages.length > 0 ? (
              <div className="space-y-3">
                <div
                  className="aspect-[16/9] rounded-2xl overflow-hidden relative group cursor-pointer"
                  onClick={() => openLightbox("image", selectedImg)}
                >
                  <img
                    src={regularImages[selectedImg]?.url}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Maximize className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </div>

                {regularImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {regularImages.slice(0, 4).map((img: any, index: number) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImg(index)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          index === selectedImg
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[16/9] bg-muted rounded-2xl flex items-center justify-center">
                <Home className="h-20 w-20 text-muted-foreground/15" />
              </div>
            )}

            {standardVideos.length > 0 && (
              <div className="premium-card p-6 space-y-4">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Vidéos
                </h3>

                {standardVideos.map((video: any, index: number) => (
                  <div
                    key={video.id}
                    className="aspect-video rounded-xl overflow-hidden bg-black relative group cursor-pointer"
                    onClick={() => openLightbox("video", index)}
                  >
                    <video
                      src={video.url}
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Maximize className="h-8 w-8 text-white opacity-60 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {panoramas.length > 0 && (
              <div className="premium-card p-6 space-y-4">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-info" />
                  Visite virtuelle 360°
                </h3>

                {panoramas.map((panorama: any, index: number) => (
                  <div
                    key={panorama.id}
                    className="aspect-[16/9] rounded-xl overflow-hidden relative"
                  >
                    <PanoramaViewer imageUrl={panorama.url} />
                    <button
                      onClick={() => openLightbox("panorama", index)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
                      title="Plein écran"
                    >
                      <Maximize className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tour360Videos.length > 0 && (
              <div className="premium-card p-6 space-y-4">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-secondary" />
                  Visite guidée 360° (vidéo)
                </h3>

                {tour360Videos.map((video: any, index: number) => (
                  <div
                    key={video.id}
                    className="aspect-video rounded-xl overflow-hidden bg-black relative group cursor-pointer"
                    onClick={() => openLightbox("tour360", index)}
                  >
                    <video
                      src={video.url}
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Maximize className="h-8 w-8 text-white opacity-60 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className="bg-primary text-primary-foreground">
                  {listingTypeLabels[listing.listing_type]}
                </Badge>

                <Badge variant="outline">
                  {propertyTypeLabels[listing.property_type] ??
                    listing.property_type}
                </Badge>

                {listing.furnished && (
                  <Badge variant="outline">
                    <Armchair className="h-3 w-3 mr-1" />
                    Meublé
                  </Badge>
                )}

                {listing.featured && (
                  <Badge className="bg-secondary text-secondary-foreground">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Vedette
                  </Badge>
                )}
              </div>

              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
                  {listing.title}
                </h1>

                {isAvailable && (
                  <FavoriteButton
                    propertyId={listing.property_id}
                    size="md"
                    className="shrink-0"
                  />
                )}
              </div>

              <p className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-secondary" />
                {[listing.district, listing.commune, listing.city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>

            <div className="premium-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isShortRental ? "À partir de" : "Prix"}
                </p>

                <p className="text-3xl font-bold text-foreground">
                  {formatMoney(
                    isShortRental ? shortRentalNightlyRate : listing.price,
                    isShortRental ? shortRentalCurrency : listing.currency,
                  )}

                  {listing.listing_type !== "sale" && (
                    <span className="text-base font-normal text-muted-foreground ml-1">
                      {isShortRental ? "/nuit" : "/mois"}
                    </span>
                  )}
                </p>

                {!isShortRental && Number(listing.charges ?? 0) > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    + {formatMoney(listing.charges, listing.currency)} de charges
                  </p>
                )}

                {isShortRental && shortRentalCleaningFee > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Frais de ménage :{" "}
                    {formatMoney(shortRentalCleaningFee, shortRentalCurrency)}
                  </p>
                )}

                {isShortRental && shortRentalDeposit > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Caution séparée :{" "}
                    {formatMoney(shortRentalDeposit, shortRentalCurrency)}
                  </p>
                )}

                {listing.available_from &&
                  isAvailable &&
                  !isShortRental && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4" />
                      Disponible à partir du {formatDate(listing.available_from)}
                    </p>
                  )}
              </div>

              <div className="flex gap-6">
                {[
                  {
                    icon: Ruler,
                    value: `${Number(listing.surface)} m²`,
                    label: "Surface",
                  },
                  {
                    icon: Building2,
                    value: listing.rooms,
                    label: "Pièces",
                  },
                  {
                    icon: BedDouble,
                    value: listing.bedrooms ?? listing.rooms,
                    label: "Chambres",
                  },
                  {
                    icon: Bath,
                    value: listing.bathrooms,
                    label: "Sdb",
                  },
                  ...(listing.floor !== null && listing.floor !== undefined
                    ? [
                        {
                          icon: Layers,
                          value: listing.floor,
                          label: "Étage",
                        },
                      ]
                    : []),
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <item.icon className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                    <p className="font-semibold text-sm">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {isShortRental && (
              <div className="premium-card p-6">
                <h3 className="font-display font-semibold text-lg mb-4">
                  Conditions du séjour
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Annulation</p>
                      <p className="text-sm text-muted-foreground">
                        Annulation gratuite jusqu'à 72 h avant l'arrivée. À moins
                        de 72 h, une pénalité de 50 % du séjour s'applique.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <WalletCards className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Paiement</p>
                      <p className="text-sm text-muted-foreground">
                        Choisissez 50 % à la confirmation avec solde avant le
                        check-in, ou 100 % à la confirmation.
                      </p>
                    </div>
                  </div>

                  {shortRentalMaxGuests > 0 && (
                    <div className="flex items-start gap-3">
                      <Users className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Capacité</p>
                        <p className="text-sm text-muted-foreground">
                          Jusqu'à {shortRentalMaxGuests} voyageur
                          {shortRentalMaxGuests > 1 ? "s" : ""}.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Disponibilité</p>
                      <p className="text-sm text-muted-foreground">
                        Les dates doivent être vérifiées avant toute confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {listing.description && (
              <div className="premium-card p-6">
                <h3 className="font-display font-semibold text-lg mb-3">
                  Description
                </h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            {(listing.amenities ?? []).length > 0 && (
              <div className="premium-card p-6">
                <h3 className="font-display font-semibold text-lg mb-3">
                  Équipements
                </h3>

                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  {listing.amenities!.map((amenity: string) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6 lg:sticky lg:top-24 lg:self-start"
          >
            {isShortRental ? (
              <PublicShortRentalBookingCard
                propertyId={listing.property_id}
                propertyAvailable={isAvailable}
              />
            ) : (
              <ContactPropertyForm
                propertyId={listing.property_id}
                propertyTitle={listing.title}
                propertyStatus={propertyStatus}
              />
            )}

            {!isShortRental && (
              <ShareActions
                title={listing.title}
                propertyStatus={propertyStatus}
                agencyPhone={
                  import.meta.env.VITE_AGENCY_WHATSAPP ?? "224620000000"
                }
              />
            )}
          </motion.div>
        </div>

        {similarFiltered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16"
          >
            <h2 className="text-2xl font-display font-bold mb-6">
              Biens similaires
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarFiltered.map((similarListing, index) => (
                <ListingCard
                  key={similarListing.id}
                  listing={similarListing}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PropertyDetailPage;