import type {
  PaymentProvider,
  ProviderInitInput,
  ProviderInitResult,
} from "./payment-provider.ts";


/**
 * Provider Orange Money réel.
 *
 * IMPORTANT :
 *
 * Cette classe définit uniquement la frontière d'intégration.
 * Elle ne déclenche volontairement aucun paiement tant que
 * le contrat Web Payment officiel du compte marchand Orange
 * Guinée n'a pas été configuré et validé.
 *
 * La logique financière AmImmo reste indépendante :
 *
 * PSP
 *   -> payment_provider_transactions
 *   -> finalize_short_rental_provider_payment()
 *   -> payments / accounting / treasury
 */
export class OrangeMoneyPaymentProvider
  implements PaymentProvider
{
  readonly name =
    "orange_money";


  async initializePayment(
    input: ProviderInitInput,
  ): Promise<ProviderInitResult> {

    /*
     * Défense locale avant tout futur appel réseau.
     */

    if (
      typeof input.providerTransactionId !==
        "string" ||
      input.providerTransactionId.trim() === ""
    ) {
      throw new Error(
        "Missing provider transaction identifier",
      );
    }


    if (
      !Number.isFinite(input.amount) ||
      input.amount <= 0
    ) {
      throw new Error(
        "Invalid Orange Money payment amount",
      );
    }


    if (
      typeof input.currency !== "string" ||
      input.currency.trim() === ""
    ) {
      throw new Error(
        "Missing Orange Money payment currency",
      );
    }


    if (
      input.paymentMethod !==
      "orange_money"
    ) {
      throw new Error(
        "Orange Money provider received an unsupported payment method",
      );
    }


    /*
     * FAIL CLOSED
     * ===========
     *
     * Ne surtout pas fabriquer ici :
     *
     * - endpoint Orange Money,
     * - merchant key,
     * - payload,
     * - callback format,
     * - checkout URL,
     * - signature.
     *
     * Ces éléments seront implémentés uniquement à partir
     * du contrat officiel remis pour le compte marchand.
     */

    throw new Error(
      "Orange Money Web Payment contract is not configured",
    );
  }
}