import {
  OrangeMoneyPaymentProvider,
} from "./orange-money-provider.ts";
export type SupportedPaymentMethod =
  | "orange_money"
  | "mtn_momo";

export type ProviderTransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export interface ProviderInitInput {
  providerTransactionId: string;
  amount: number;
  currency: string;
  paymentMethod: SupportedPaymentMethod;
}

export interface ProviderInitResult {
  providerReference: string;
  checkoutUrl: string;
  status: "processing";
}

export interface PaymentProvider {
  readonly name: string;

  initializePayment(
    input: ProviderInitInput,
  ): Promise<ProviderInitResult>;
}

/**
 * PSP simulé pour 3D.3C.3B.
 *
 * Aucun appel réseau réel.
 * Aucun secret.
 * Aucun paiement financier.
 * Aucun statut completed.
 */
export class SimulatedPaymentProvider
  implements PaymentProvider
{
  readonly name = "simulated";

  async initializePayment(
    input: ProviderInitInput,
  ): Promise<ProviderInitResult> {
    if (!input.providerTransactionId) {
      throw new Error(
        "Missing provider transaction identifier",
      );
    }

    if (
      !Number.isFinite(input.amount) ||
      input.amount <= 0
    ) {
      throw new Error(
        "Invalid transaction amount",
      );
    }

    if (!input.currency) {
      throw new Error(
        "Missing transaction currency",
      );
    }

    const providerReference =
      `SIM-${input.providerTransactionId}`;

    /*
     * URL volontairement fictive.
     *
     * Elle ne doit PAS être ouverte comme un véritable
     * checkout PSP. Elle permet uniquement de tester
     * l'orchestration INIT.
     */
    const checkoutUrl =
      `https://simulated-payment.invalid/checkout/${
        encodeURIComponent(
          input.providerTransactionId,
        )
      }`;

    return {
      providerReference,
      checkoutUrl,
      status: "processing",
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  const mode =
    (
      Deno.env.get("PAYMENT_PROVIDER_MODE") ??
        "simulated"
    )
      .trim()
      .toLowerCase();

  switch (mode) {
    case "simulated":
      return new SimulatedPaymentProvider();

    case "orange_money":
      return new OrangeMoneyPaymentProvider();

    default:
      throw new Error(
        `Unsupported PAYMENT_PROVIDER_MODE: ${mode}`,
      );
  }
}
