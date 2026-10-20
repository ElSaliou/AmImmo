import {
  supabase,
} from "@/integrations/supabase/client";


export type GuestBookingConfirmationEmailResult = {
  success: boolean;
  alreadySent: boolean;

  deliveryId: string;

  providerReference?:
    | string
    | null;

  recipient?:
    | string
    | null;

  bookingId: string;
  bookingReference: string;

  invoiceNumber?:
    | string
    | null;

  amountDueNow?:
    | number
    | null;

  currency?:
    | string
    | null;

  paymentDueAt?:
    | string
    | null;

  attemptNo?:
    | number
    | null;
};


const getFunctionErrorMessage =
  async (
    error: unknown,
  ) => {
    if (
      error instanceof Error
    ) {
      const context =
        (
          error as Error & {
            context?: unknown;
          }
        ).context;

      if (
        context instanceof Response
      ) {
        try {
          const payload =
            await context
              .clone()
              .json() as {
                error?: unknown;
              };

          if (
            typeof payload.error ===
              "string" &&
            payload.error.trim()
          ) {
            return payload.error.trim();
          }
        } catch {
          // Fall back to the Supabase client error message.
        }
      }

      return error.message;
    }

    return "Impossible d'envoyer l'email de confirmation au voyageur.";
  };


export const sendGuestBookingConfirmationEmail =
  async (
    bookingId: string,
  ): Promise<GuestBookingConfirmationEmailResult> => {
    const normalizedBookingId =
      bookingId.trim();

    if (!normalizedBookingId) {
      throw new Error(
        "Identifiant de réservation manquant.",
      );
    }

    const {
      data,
      error,
    } =
      await supabase.functions.invoke<
        GuestBookingConfirmationEmailResult
      >(
        "send-guest-booking-confirmation-email",
        {
          body: {
            bookingId:
              normalizedBookingId,
          },
        },
      );

    if (error) {
      throw new Error(
        await getFunctionErrorMessage(
          error,
        ),
      );
    }

    if (
      !data ||
      data.success !== true
    ) {
      throw new Error(
        "La fonction d'envoi n'a pas confirmé la livraison.",
      );
    }

    return data;
  };