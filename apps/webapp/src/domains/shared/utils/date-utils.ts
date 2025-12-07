/**
 * Formats a timestamp as a relative date string.
 * Uses Intl.RelativeTimeFormat for localized output.
 *
 * @example
 * formatRelativeDate(Date.now() - 60000) // "1 minute ago"
 * formatRelativeDate(Date.now() - 86400000) // "1 day ago"
 */
export function formatRelativeDate(
  timestamp: number,
  locale: string = "en"
): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (seconds < 60) {
    return rtf.format(-seconds, "second");
  } else if (minutes < 60) {
    return rtf.format(-minutes, "minute");
  } else if (hours < 24) {
    return rtf.format(-hours, "hour");
  } else if (days < 7) {
    return rtf.format(-days, "day");
  } else if (weeks < 4) {
    return rtf.format(-weeks, "week");
  } else if (months < 12) {
    return rtf.format(-months, "month");
  } else {
    return rtf.format(-years, "year");
  }
}

/**
 * Formats a timestamp as a short date string.
 * Uses Intl.DateTimeFormat for localized output.
 *
 * @example
 * formatShortDate(Date.now()) // "Dec 7, 2024"
 */
export function formatShortDate(
  timestamp: number,
  locale: string = "en"
): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}
