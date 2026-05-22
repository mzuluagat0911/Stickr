import { parsePhoneNumberFromString } from "libphonenumber-js";

export function formatWhatsAppDisplay(e164: string): string {
  const trimmed = e164.trim();
  const parsed = parsePhoneNumberFromString(trimmed);
  if (parsed?.isValid()) {
    return parsed.formatInternational();
  }
  return trimmed;
}
