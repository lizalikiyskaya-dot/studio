export function shortenUrl(url: string, maxLength = 32): string {
  let display = url;
  try {
    const parsed = new URL(url);
    display = parsed.hostname.replace(/^www\./, "") + parsed.pathname + parsed.search;
  } catch {
    // not a valid absolute URL — fall back to the raw string
  }
  if (display.length <= maxLength) return display;
  return display.slice(0, maxLength - 1) + "…";
}
