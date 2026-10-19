/**
 * Coordonnées de référence d'un séjour.
 *
 * Les valeurs sont figées dans la réservation :
 * - booking.guest_email
 * - booking.guest_phone
 *
 * Le profil voyageur peut évoluer indépendamment.
 */

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export const normalizeGuestEmail = (
  value: string,
) =>
  value
    .trim()
    .toLowerCase();

export const isValidGuestEmail = (
  value: string,
) => {
  const normalized =
    normalizeGuestEmail(
      value,
    );

  return (
    normalized.length > 0 &&
    normalized.length <= 320 &&
    EMAIL_PATTERN.test(
      normalized,
    )
  );
};

export const normalizeGuestPhone = (
  value: string,
) => {
  const raw =
    value.trim();

  if (!raw) {
    return "";
  }

  let normalized =
    raw.replace(
      /[^\d+]/g,
      "",
    );

  if (
    normalized.startsWith(
      "00",
    )
  ) {
    normalized =
      `+${normalized.slice(2)}`;
  }

  if (
    normalized.startsWith(
      "+",
    )
  ) {
    normalized =
      `+${normalized
        .slice(1)
        .replace(/\+/g, "")}`;
  } else {
    normalized =
      normalized.replace(
        /\+/g,
        "",
      );
  }

  return normalized;
};

export const isValidGuestPhone = (
  value: string,
) => {
  const normalized =
    normalizeGuestPhone(
      value,
    );

  const digits =
    normalized.replace(
      /\D/g,
      "",
    );

  return (
    digits.length >= 8 &&
    digits.length <= 15
  );
};
