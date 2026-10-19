export type GuestCommunicationChannel =
  | "email"
  | "whatsapp"
  | "sms";

export type GuestCommunicationChannelConfig = {
  key:
    GuestCommunicationChannel;

  label:
    string;

  enabled:
    boolean;

  configured:
    boolean;

  reservationField:
    "guest_email" |
    "guest_phone";

  description:
    string;
};

export const GUEST_COMMUNICATION_CHANNELS:
  Record<
    GuestCommunicationChannel,
    GuestCommunicationChannelConfig
  > = {
    email: {
      key:
        "email",

      label:
        "E-mail",

      enabled:
        true,

      configured:
        true,

      reservationField:
        "guest_email",

      description:
        "Canal actif pour les confirmations et liens sécurisés.",
    },

    whatsapp: {
      key:
        "whatsapp",

      label:
        "WhatsApp",

      enabled:
        false,

      configured:
        false,

      reservationField:
        "guest_phone",

      description:
        "Architecture prête ; configuration fournisseur à venir.",
    },

    sms: {
      key:
        "sms",

      label:
        "SMS",

      enabled:
        false,

      configured:
        false,

      reservationField:
        "guest_phone",

      description:
        "Architecture prête ; configuration fournisseur à venir.",
    },
  };

export const GUEST_PRIMARY_COMMUNICATION_CHANNEL:
  GuestCommunicationChannel =
    "email";
