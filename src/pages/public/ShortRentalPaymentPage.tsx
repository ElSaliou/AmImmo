import { useState } from "react";

import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  useParams,
} from "react-router-dom";

import {
  type PublicShortRentalPaymentMethod,
  usePublicShortRentalPaymentContext,
  usePublicShortRentalPaymentInit,
} from "@/hooks/use-public-short-rental-payment";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Separator,
} from "@/components/ui/separator";

// ============================================================
// FORMATTERS
// ============================================================

const formatMoney = (
  amount: number,
  currency: string,
) => {
  const safeAmount =
    Number.isFinite(amount)
      ? amount
      : 0;

  try {
    return new Intl.NumberFormat(
      "fr-FR",
      {
        style:
          "currency",

        currency:
          currency ||
          "GNF",

        maximumFractionDigits:
          currency ===
          "GNF"
            ? 0
            : 2,
      },
    ).format(
      safeAmount,
    );
  } catch {
    return `${safeAmount.toLocaleString(
      "fr-FR",
    )} ${currency}`;
  }
};

const formatDate = (
  value?: string | null,
) => {
  if (!value) {
    return "—";
  }

  const parts =
    value
      .slice(
        0,
        10,
      )
      .split("-")
      .map(Number);

  if (
    parts.length !== 3
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] = parts;

  const date =
    new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0,
    );

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    },
  ).format(
    date,
  );
};

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  ).format(
    date,
  );
};

// ============================================================
// SMALL COMPONENTS
// ============================================================

type AmountRowProps = {
  label: string;
  value: string;
  strong?: boolean;
};

const AmountRow = ({
  label,
  value,
  strong = false,
}: AmountRowProps) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span
      className={
        strong
          ? "font-medium text-foreground"
          : "text-muted-foreground"
      }
    >
      {label}
    </span>

    <span
      className={
        strong
          ? "font-semibold text-foreground"
          : "font-medium text-foreground"
      }
    >
      {value}
    </span>
  </div>
);

// ============================================================
// PAGE
// ============================================================

const ShortRentalPaymentPage =
  () => {
    const {
      token,
    } =
      useParams<{
        token: string;
      }>();

    const {
      data,
      isLoading,
      isFetching,
      isError,
      refetch,
    } =
      usePublicShortRentalPaymentContext(
        token,
      );

    const [
      selectedPaymentMethod,
      setSelectedPaymentMethod,
    ] =
      useState<PublicShortRentalPaymentMethod>(
        "orange_money",
      );

    const paymentInit =
      usePublicShortRentalPaymentInit();


    // ========================================================
    // TOKEN ABSENT
    // ========================================================

    if (!token) {
      return (
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <InvalidPaymentLink />
        </div>
      );
    }

    // ========================================================
    // LOADING
    // ========================================================

    if (isLoading) {
      return (
        <div className="mx-auto flex min-h-[420px] w-full max-w-3xl items-center justify-center px-4 py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />

            <div>
              <p className="font-medium">
                Chargement de votre réservation
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Vérification sécurisée du lien de paiement…
              </p>
            </div>
          </div>
        </div>
      );
    }

    // ========================================================
    // TOKEN INVALIDE / EXPIRE / REVOQUE
    // ========================================================

    if (
      isError ||
      !data
    ) {
      return (
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          <InvalidPaymentLink
            onRetry={
              () =>
                refetch()
            }
          />
        </div>
      );
    }

    // ========================================================
    // V3C.5
    // DECISION SERVEUR
    //
    // IMPORTANT :
    // aucune décision d'autorisation n'est reconstruite ici.
    // ========================================================

    const canPay =
      data.can_pay ===
      true;

    const blockReason =
      data.payment_block_reason;

    const alreadyPaid =
      blockReason ===
      "already_paid";

    const deadlinePassed =
      blockReason ===
      "payment_deadline_passed";

    const bookingNotPayable =
      blockReason ===
      "booking_not_payable";

    const nothingToPay =
      blockReason ===
      "nothing_to_pay";

    const blockedForKnownReason =
      !canPay &&
      Boolean(
        blockReason,
      );

    /*
     * Cette information est seulement descriptive.
     * Elle ne détermine PAS si le paiement est autorisé.
     */
    const partiallyPaid =
      data.paid_amount >
        0 &&
      data.remaining_amount >
        0;

    /*
     * Autorisation métier :
     *   canPay
     *
     * Disponibilité technique :
     *   PAYMENT_PROVIDER_READY
     *
     * Il ne faut jamais fusionner ces deux responsabilités.
     */
    const paymentActionEnabled =
      canPay &&
      Boolean(
        selectedPaymentMethod,
      ) &&
      !paymentInit.isPending;

    const paymentPlanLabel =
      data.payment_plan ===
        "half"
        ? `Paiement en 2 fois — ${data.initial_payment_percent}% au premier paiement`
        : "Paiement intégral";

    const simulatedPaymentInitialized =
      paymentInit.data
        ? new URL(
            paymentInit.data.checkout_url,
          ).hostname ===
          "simulated-payment.invalid"
        : false;


    const handlePayment =
      async () => {
        if (
          !token ||
          !canPay ||
          !selectedPaymentMethod ||
          paymentInit.isPending
        ) {
          return;
        }

        paymentInit.reset();

        try {
          const transaction =
            await paymentInit.mutateAsync({
              token,

              paymentMethod:
                selectedPaymentMethod,
            });

          const checkoutUrl =
            new URL(
              transaction.checkout_url,
            );

          /*
           * Le provider simulé ne doit jamais ouvrir
           * de faux site dans le navigateur.
           */
          if (
            checkoutUrl.hostname ===
            "simulated-payment.invalid"
          ) {
            return;
          }

          window.location.assign(
            checkoutUrl.toString(),
          );
        } catch {
          /*
           * L'erreur est exposée par React Query
           * via paymentInit.error.
           */
        }
      };


    // ========================================================
    // RENDER
    // ========================================================

    return (
      <div className="bg-muted/20">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
          {/* =============================================== */}
          {/* HEADER                                          */}
          {/* =============================================== */}

          <div className="mb-8 text-center">
            <div className="mb-3 flex justify-center">
              <Badge
                variant="secondary"
                className="gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />

                Accès sécurisé
              </Badge>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Paiement de votre réservation
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Consultez le récapitulatif de votre séjour et votre situation de paiement.
            </p>
          </div>

          {/* =============================================== */}
          {/* BUSINESS STATES - SERVEUR                       */}
          {/* =============================================== */}

          {alreadyPaid && (
            <Alert className="mb-6 border-emerald-200 bg-emerald-50/70">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />

              <AlertTitle className="text-emerald-900">
                Réservation entièrement payée
              </AlertTitle>

              <AlertDescription className="text-emerald-800">
                Le paiement de cette réservation est intégralement enregistré. Aucun règlement supplémentaire n'est nécessaire.
              </AlertDescription>
            </Alert>
          )}

          {deadlinePassed && (
            <Alert
              variant="destructive"
              className="mb-6"
            >
              <Clock3 className="h-4 w-4" />

              <AlertTitle>
                Délai de paiement dépassé
              </AlertTitle>

              <AlertDescription>
                Le délai prévu pour effectuer le premier paiement est dépassé. Le paiement en ligne est actuellement bloqué. Contactez l'agence pour connaître la suite de votre réservation.
              </AlertDescription>
            </Alert>
          )}

          {bookingNotPayable && (
            <Alert
              variant="destructive"
              className="mb-6"
            >
              <Ban className="h-4 w-4" />

              <AlertTitle>
                Paiement indisponible
              </AlertTitle>

              <AlertDescription>
                Le statut actuel de cette réservation ne permet plus d'effectuer un paiement en ligne.
              </AlertDescription>
            </Alert>
          )}

          {nothingToPay && (
            <Alert className="mb-6">
              <Info className="h-4 w-4" />

              <AlertTitle>
                Aucun montant à régler actuellement
              </AlertTitle>

              <AlertDescription>
                Aucun paiement n'est demandé pour le moment sur cette réservation.
              </AlertDescription>
            </Alert>
          )}

          {canPay &&
            partiallyPaid && (
              <Alert className="mb-6">
                <CheckCircle2 className="h-4 w-4" />

                <AlertTitle>
                  Premier paiement enregistré
                </AlertTitle>

                <AlertDescription>
                  Une partie de votre réservation a déjà été réglée. Le serveur autorise le paiement du solde indiqué ci-dessous.
                </AlertDescription>
              </Alert>
            )}

          {canPay &&
            !partiallyPaid && (
              <Alert className="mb-6 border-primary/20 bg-primary/5">
                <CreditCard className="h-4 w-4 text-primary" />

                <AlertTitle>
                  Paiement autorisé
                </AlertTitle>

                <AlertDescription>
                  Votre réservation est éligible au paiement. Le montant demandé actuellement est indiqué ci-dessous.
                </AlertDescription>
              </Alert>
            )}

          {/* =============================================== */}
          {/* GRID                                            */}
          {/* =============================================== */}

          <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            {/* ============================================= */}
            {/* BOOKING                                       */}
            {/* ============================================= */}

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ReceiptText className="h-5 w-5 text-primary" />

                      Votre réservation
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Référence{" "}
                      <span className="font-medium text-foreground">
                        {data.booking_reference}
                      </span>
                    </CardDescription>
                  </div>

                  <BookingStatusBadge
                    canPay={
                      canPay
                    }
                    blockReason={
                      blockReason
                    }
                    partiallyPaid={
                      partiallyPaid
                    }
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* DATES */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />

                      Arrivée
                    </div>

                    <p className="font-medium">
                      {formatDate(
                        data.check_in,
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />

                      Départ
                    </div>

                    <p className="font-medium">
                      {formatDate(
                        data.check_out,
                      )}
                    </p>
                  </div>
                </div>

                {/* GUESTS */}

                <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />

                    <span className="text-sm text-muted-foreground">
                      Voyageurs
                    </span>
                  </div>

                  <span className="font-medium">
                    {data.guests_count}
                  </span>
                </div>

                {/* PLAN */}

                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm text-muted-foreground">
                    Formule de paiement
                  </p>

                  <p className="mt-1 font-medium">
                    {paymentPlanLabel}
                  </p>
                </div>

                {/* INVOICE */}

                {data.invoice_number && (
                  <div className="text-xs text-muted-foreground">
                    Facture :{" "}
                    <span className="font-medium">
                      {data.invoice_number}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============================================= */}
            {/* PAYMENT CARD                                  */}
            {/* ============================================= */}

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />

                  Paiement
                </CardTitle>

                <CardDescription>
                  Situation financière calculée par le serveur.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <AmountRow
                  label="Montant total"
                  value={
                    formatMoney(
                      data.total_amount,
                      data.currency,
                    )
                  }
                />

                <AmountRow
                  label="Déjà payé"
                  value={
                    formatMoney(
                      data.paid_amount,
                      data.currency,
                    )
                  }
                />

                <AmountRow
                  label="Solde restant"
                  value={
                    formatMoney(
                      data.remaining_amount,
                      data.currency,
                    )
                  }
                />

                <Separator className="my-4" />

                {canPay && (
                  <div className="rounded-xl bg-primary/5 p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      À régler maintenant
                    </p>

                    <p className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                      {formatMoney(
                        data.amount_due_now,
                        data.currency,
                      )}
                    </p>
                  </div>
                )}

                {alreadyPaid && (
                  <div className="rounded-xl bg-emerald-50 p-4 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />

                    <p className="mt-2 font-semibold text-emerald-900">
                      Aucun solde à payer
                    </p>
                  </div>
                )}

                {!canPay &&
                  !alreadyPaid && (
                    <div className="rounded-xl border bg-muted/40 p-4 text-center">
                      <Ban className="mx-auto h-7 w-7 text-muted-foreground" />

                      <p className="mt-2 font-semibold">
                        Paiement non autorisé
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Aucun paiement ne peut être initié depuis ce lien dans la situation actuelle.
                      </p>
                    </div>
                  )}

                {/* DEADLINE */}

                {!alreadyPaid &&
                  data.payment_due_at && (
                    <div className="mt-5 flex gap-3 rounded-lg border p-4">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                      <div>
                        <p className="text-sm font-medium">
                          Échéance du premier paiement
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDateTime(
                            data.payment_due_at,
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                {/* CTA */}

                {canPay && (
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-sm font-semibold">
                        Moyen de paiement
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Choisissez le service mobile que vous souhaitez utiliser.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        aria-pressed={
                          selectedPaymentMethod ===
                          "orange_money"
                        }
                        onClick={
                          () => {
                            paymentInit.reset();

                            setSelectedPaymentMethod(
                              "orange_money",
                            );
                          }
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          selectedPaymentMethod ===
                          "orange_money"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "bg-background hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <CreditCard className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-semibold">
                              Orange Money
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Paiement mobile sécurisé
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        aria-pressed={
                          selectedPaymentMethod ===
                          "mtn_momo"
                        }
                        onClick={
                          () => {
                            paymentInit.reset();

                            setSelectedPaymentMethod(
                              "mtn_momo",
                            );
                          }
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          selectedPaymentMethod ===
                          "mtn_momo"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "bg-background hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <CreditCard className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-semibold">
                              MTN MoMo
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Paiement mobile sécurisé
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {paymentInit.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />

                        <AlertTitle>
                          Paiement non initialisé
                        </AlertTitle>

                        <AlertDescription>
                          {paymentInit.error instanceof
                          Error
                            ? paymentInit.error.message
                            : "Une erreur est survenue pendant l'initialisation du paiement."}
                        </AlertDescription>
                      </Alert>
                    )}

                    {simulatedPaymentInitialized &&
                      paymentInit.data && (
                        <Alert className="border-primary/20 bg-primary/5">
                          <CheckCircle2 className="h-4 w-4 text-primary" />

                          <AlertTitle>
                            Transaction de test initialisée
                          </AlertTitle>

                          <AlertDescription>
                            Le provider simulé a accepté la transaction{" "}
                            <span className="font-medium">
                              {paymentInit.data.reference}
                            </span>
                            . Aucun paiement réel n'a été effectué.
                          </AlertDescription>
                        </Alert>
                      )}

                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      disabled={
                        !paymentActionEnabled
                      }
                      onClick={
                        handlePayment
                      }
                    >
                      {paymentInit.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                          Initialisation…
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />

                          Continuer avec{" "}
                          {selectedPaymentMethod ===
                          "orange_money"
                            ? "Orange Money"
                            : "MTN MoMo"}
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      Le montant est calculé et contrôlé par le serveur. Il ne peut pas être modifié depuis cette page.
                    </p>
                  </div>
                )}

                {!canPay && (
                  <div className="mt-5">
                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      variant="outline"
                      disabled
                    >
                      <Ban className="mr-2 h-4 w-4" />

                      Paiement indisponible
                    </Button>
                  </div>
                )}

                {/* SECURITY */}

                <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

                  <span>
                    Cette page utilise un lien individuel sécurisé. Ne transmettez pas ce lien à un tiers.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* =============================================== */}
          {/* REFRESH                                         */}
          {/* =============================================== */}

          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              disabled={
                isFetching
              }
              onClick={
                () =>
                  refetch()
              }
            >
              {isFetching && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              Actualiser la situation
            </Button>
          </div>

          {/* =============================================== */}
          {/* UNKNOWN SERVER BLOCK                            */}
          {/* =============================================== */}

          {!canPay &&
            !blockedForKnownReason && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Le paiement n'est actuellement pas autorisé pour cette réservation.
              </p>
            )}
        </div>
      </div>
    );
  };

// ============================================================
// INVALID LINK
// ============================================================

type InvalidPaymentLinkProps = {
  onRetry?: () => void;
};

const InvalidPaymentLink = ({
  onRetry,
}: InvalidPaymentLinkProps) => (
  <Card>
    <CardContent className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>

      <h1 className="mt-5 text-xl font-semibold">
        Lien de paiement indisponible
      </h1>

      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Ce lien est invalide, a expiré ou n'est plus actif. Si votre réservation a été confirmée récemment, contactez l'agence pour obtenir un nouveau lien sécurisé.
      </p>

      {onRetry && (
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={
            onRetry
          }
        >
          Réessayer
        </Button>
      )}
    </CardContent>
  </Card>
);

// ============================================================
// STATUS
// ============================================================

type BookingStatusBadgeProps = {
  canPay: boolean;

  blockReason:
    | string
    | null;

  partiallyPaid: boolean;
};

const BookingStatusBadge = ({
  canPay,
  blockReason,
  partiallyPaid,
}: BookingStatusBadgeProps) => {
  if (
    blockReason ===
    "already_paid"
  ) {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">
        Payée
      </Badge>
    );
  }

  if (
    blockReason ===
    "payment_deadline_passed"
  ) {
    return (
      <Badge variant="destructive">
        Échéance dépassée
      </Badge>
    );
  }

  if (
    blockReason ===
    "booking_not_payable"
  ) {
    return (
      <Badge variant="secondary">
        Paiement fermé
      </Badge>
    );
  }

  if (
    blockReason ===
    "nothing_to_pay"
  ) {
    return (
      <Badge variant="secondary">
        Rien à payer
      </Badge>
    );
  }

  if (
    canPay &&
    partiallyPaid
  ) {
    return (
      <Badge variant="secondary">
        Partiellement payée
      </Badge>
    );
  }

  if (canPay) {
    return (
      <Badge variant="outline">
        Paiement en attente
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      Paiement indisponible
    </Badge>
  );
};

export default ShortRentalPaymentPage;
