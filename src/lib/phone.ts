/**
 * Argentine mobile numbers. The customer types it however they're used to ("2478 567168", "02478 15-567168",
 * "+54 9 2478 567168"); it's stored in the wa.me format the shop's app opens: 549 + area code + number.
 */

/** Area code + number without the 0 and the 15: always 10 digits in Argentina */
const NATIONAL_DIGITS = 10;

/** "5492478567168", or null if it isn't a 10-digit Argentine number once the prefixes are taken out */
export const normalizePhone = (input: string): string | null => {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('54')) digits = digits.slice(2);
  if (digits.startsWith('9') && digits.length === NATIONAL_DIGITS + 1) digits = digits.slice(1);
  if (digits.startsWith('0')) digits = digits.slice(1);
  // The 15 goes after the area code (2 to 4 digits): drop it if the number is one too long with it
  if (digits.length === NATIONAL_DIGITS + 2) {
    for (const areaLength of [2, 3, 4]) {
      if (digits.slice(areaLength, areaLength + 2) === '15') {
        digits = digits.slice(0, areaLength) + digits.slice(areaLength + 2);
        break;
      }
    }
  }
  return digits.length === NATIONAL_DIGITS ? `549${digits}` : null;
};

/** "5492478567168" → "2478 567168" (for showing it back) */
export const formatPhone = (normalized: string): string => {
  const national = normalized.replace(/^549/, '');
  return `${national.slice(0, 4)} ${national.slice(4)}`;
};
