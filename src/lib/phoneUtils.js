/** Philippine mobile normalization — safe for client and server */

export function normalizePhilippinePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("63") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith("0") && digits.length === 11) return digits;
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;

  return null;
}

export function formatPhoneForIProgApi(raw) {
  const local = normalizePhilippinePhone(raw);
  if (!local) return null;
  return `63${local.slice(1)}`;
}
