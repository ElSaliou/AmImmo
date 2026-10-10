type ErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  constraint?: unknown;
};

const BILLING_MESSAGES: Record<string, string> = {
  BILLING_EXISTING_INVOICE_CONFLICT:
    "Une facture de loyer déjà comptabilisée est incompatible avec cette opération. Une régularisation comptable est nécessaire avant de poursuivre.",

  BILLING_LATER_INVOICE_REQUIRES_REGULARIZATION:
    "Une facture existe pour un mois postérieur à la date de sortie. Régularisez-la avant de clôturer le bail.",

  BILLING_EXISTING_INVOICE_PERIOD_INVALID:
    "Une facture existante possède une période invalide. Une régularisation est requise avant la clôture.",

  BILLING_MULTIPLE_ACTIVE_INVOICES:
    "Plusieurs factures de loyer actives existent pour la même période. Régularisez la facturation avant de poursuivre.",

  BILLING_TERMINATION_NOT_EARLY:
    "Pour un bail à durée déterminée, la résiliation doit être strictement antérieure à la date de fin contractuelle.",

  BILLING_MUTUAL_RULE_REQUIRED:
    "Pour un accord mutuel, choisissez explicitement Prorata ou Mois complet.",

  BILLING_RULE_NOT_ALLOWED:
    "La règle de facturation sélectionnée n'est pas autorisée pour cet initiateur.",

  BILLING_SAME_MONTH_POLICY_CONFLICT:
    "Ce cas nécessite une revue manuelle avant clôture du bail.",

  BILLING_INVALID_EFFECTIVE_DATE:
    "La date effective de sortie n'est pas valide.",

  BILLING_CONTEXT_MISMATCH:
    "Le contexte de facturation ne correspond pas à la sortie demandée.",

  BILLING_AMENDMENT_EXISTING_INVOICE_CONFLICT:
    "Une facture de loyer existe déjà pour le mois d'effet de cet avenant ou pour un mois ultérieur. Régularisez la facturation avant de modifier les conditions financières.",
};

const AMENDMENT_MESSAGES: Record<string, string> = {
  LEASE_AMENDMENT_INVALID_EFFECTIVE_DATE:
    "La date d'effet de l'avenant n'est pas valide.",

  LEASE_AMENDMENT_REASON_REQUIRED:
    "Le motif de l'avenant est obligatoire.",

  LEASE_AMENDMENT_CHANGES_REQUIRED:
    "Sélectionnez au moins une modification pour créer l'avenant.",

  LEASE_AMENDMENT_UNSUPPORTED_FIELD:
    "Cet avenant contient un champ non pris en charge.",

  LEASE_AMENDMENT_LEASE_NOT_FOUND:
    "Bail introuvable.",

  LEASE_AMENDMENT_ACTIVE_LEASE_REQUIRED:
    "Un avenant ne peut être appliqué qu'à un bail actif.",

  LEASE_AMENDMENT_BEFORE_LEASE_START:
    "La date d'effet de l'avenant ne peut pas être antérieure au début du bail.",

  LEASE_AMENDMENT_EFFECTIVE_DATE_NOT_FORWARD:
    "La date d'effet doit être postérieure à la dernière version contractuelle.",

  LEASE_AMENDMENT_AFTER_CURRENT_END_DATE:
    "La date d'effet ne peut pas être postérieure à la date de fin contractuelle actuelle.",

  LEASE_AMENDMENT_INVALID_MONTHLY_RENT:
    "Le nouveau loyer doit être supérieur à zéro.",

  LEASE_AMENDMENT_INVALID_CHARGES:
    "Le montant des charges doit être supérieur ou égal à zéro.",

  LEASE_AMENDMENT_INVALID_DEPOSIT:
    "Le dépôt de garantie doit être supérieur ou égal à zéro.",

  LEASE_AMENDMENT_INVALID_DUE_DAY:
    "Le jour d'échéance doit être compris entre 1 et 31.",

  LEASE_AMENDMENT_INVALID_END_DATE:
    "La nouvelle date de fin contractuelle n'est pas valide.",

  LEASE_AMENDMENT_END_DATE_BEFORE_EFFECTIVE_DATE:
    "La nouvelle date de fin ne peut pas être antérieure à la date d'effet de l'avenant.",

  LEASE_AMENDMENT_NO_CHANGES:
    "Aucune modification contractuelle n'a été détectée.",

  LEASE_AMENDMENT_FINANCIAL_EFFECTIVE_DATE_MUST_BE_MONTH_START:
    "Un avenant financier doit prendre effet le premier jour d'un mois.",
};

const COMMON_ERROR_MESSAGES: ReadonlyArray<
  readonly [needle: string, message: string]
> = [
  [
    "TERMINATION_POLICY_REQUIRED",
    "Les conditions de résiliation doivent préciser l'initiateur et la règle de facturation.",
  ],
  [
    "uq_leases_one_active_per_property",
    "Un autre bail actif existe déjà pour ce bien.",
  ],
  [
    "seuls les baux en attente peuvent être supprimés",
    "Seuls les baux en attente peuvent être supprimés.",
  ],
  [
    "une ou plusieurs factures lui sont déjà rattachées",
    "Ce bail ne peut plus être supprimé car une ou plusieurs factures lui sont déjà rattachées.",
  ],
  [
    "Impossible d'activer ce bail : il est introuvable ou n'est plus en attente.",
    "Impossible d'activer ce bail : il est introuvable ou n'est plus en attente.",
  ],
  [
    "Un nouveau bail doit être créé avec le statut en attente.",
    "Un nouveau bail doit être créé avec le statut en attente.",
  ],
  [
    "Un nouveau bail ne peut pas contenir de données de résiliation.",
    "Un nouveau bail ne peut pas contenir de données de résiliation.",
  ],
  [
    "Seul un bail actif peut être résilié.",
    "Seul un bail actif peut être résilié.",
  ],
  [
    "Seul un bail actif peut être expiré.",
    "Seul un bail actif peut être expiré.",
  ],
  [
    "Un bail sans date de fin contractuelle ne peut pas être expiré.",
    "Un bail sans date de fin contractuelle ne peut pas être expiré. Utilisez la résiliation.",
  ],
  [
    "Le bail ne peut pas être expiré avant sa date de fin contractuelle.",
    "Le bail ne peut pas être expiré avant sa date de fin contractuelle.",
  ],
  [
    "La date de résiliation ne peut pas être future.",
    "La date de résiliation ne peut pas être future.",
  ],
  [
    "La date de résiliation ne peut pas être antérieure au début du bail.",
    "La date de résiliation ne peut pas être antérieure au début du bail.",
  ],
  [
    "La sortie du bail exige d'abord une facture finale de loyer conforme.",
    "La sortie du bail exige une facture finale de loyer conforme avant la clôture.",
  ],
  [
    "Bail introuvable.",
    "Bail introuvable.",
  ],
  [
    "Accès refusé.",
    "Vous n'avez pas les droits nécessaires pour effectuer cette opération.",
  ],
];

const asText = (
  value: unknown,
): string =>
  typeof value === "string"
    ? value
    : "";

const getErrorSource = (
  error: unknown,
) => {
  if (
    typeof error === "string"
  ) {
    return error;
  }

  if (
    !error ||
    typeof error !== "object"
  ) {
    return "";
  }

  const candidate =
    error as ErrorLike;

  return [
    asText(candidate.code),
    asText(candidate.message),
    asText(candidate.details),
    asText(candidate.hint),
    asText(candidate.constraint),
  ]
    .filter(Boolean)
    .join(" | ");
};

const findMappedMessage = (
  source: string,
  messages: Record<string, string>,
) => {
  for (
    const [code, message] of
    Object.entries(messages)
  ) {
    if (
      source.includes(code)
    ) {
      return message;
    }
  }

  return null;
};

export const getLeaseBillingResolutionMessage = (
  code:
    | string
    | null
    | undefined,
): string => {
  if (!code) {
    return "Le calcul de facturation n'est pas validé.";
  }

  return (
    BILLING_MESSAGES[code] ??
    "Le calcul de facturation n'est pas validé."
  );
};

export const getRealEstateErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const source =
    getErrorSource(error);

  const billingMessage =
    findMappedMessage(
      source,
      BILLING_MESSAGES,
    );

  if (billingMessage) {
    return billingMessage;
  }

  const amendmentMessage =
    findMappedMessage(
      source,
      AMENDMENT_MESSAGES,
    );

  if (amendmentMessage) {
    return amendmentMessage;
  }

  for (
    const [
      needle,
      message,
    ] of COMMON_ERROR_MESSAGES
  ) {
    if (
      source.includes(
        needle,
      )
    ) {
      return message;
    }
  }

  const errorCode =
    error &&
    typeof error === "object"
      ? asText(
          (
            error as ErrorLike
          ).code,
        )
      : "";

  if (
    errorCode === "42501"
  ) {
    return "Vous n'avez pas les droits nécessaires pour effectuer cette opération.";
  }

  if (
    errorCode === "P0002"
  ) {
    return "Bail introuvable.";
  }

  return fallback;
};
