/**
 * Detects parked, for-sale, and placeholder domains to prevent
 * garbage signals from entering the pipeline.
 */

const PARKING_DOMAINS = new Set([
  "hugedomains.com",
  "godaddy.com",
  "afternic.com",
  "sedo.com",
  "dan.com",
  "undeveloped.com",
  "bodis.com",
  "parkingcrew.net",
  "above.com",
  "domainmarket.com",
  "buydomains.com",
  "namecheap.com",
  "fabulous.com",
  "domainlore.co.uk",
  "networksolutions.com",
  "parked.com",
  "register.com",
  "domainnamesales.com",
  "domainname.com",
  "domainnameshop.com",
]);

const PARKING_TEXT_SIGNALS = [
  /this domain is for sale/i,
  /buy this domain/i,
  /domain is available/i,
  /domain may be for sale/i,
  /purchase this domain/i,
  /make an offer on this domain/i,
  /domain has been registered/i,
  /this page is parked/i,
  /parked free.*courtesy/i,
  /domain parking/i,
  /is for sale at/i,
  /start payment plan/i,
  /buy now.*domain/i,
  /domain broker/i,
  /the domain.*has expired/i,
  /this site is under construction/i,
  /coming soon.*page/i,
  /website is under construction/i,
  /this website is currently unavailable/i,
];

/**
 * Check if a URL has been redirected to a known parking provider.
 * Compare the final response URL hostname against parking domains.
 */
export function isParkedRedirect(finalUrl: string, originalUrl: string): boolean {
  try {
    const finalHost = new URL(finalUrl).hostname.replace(/^www\./, "").toLowerCase();
    const origHost = new URL(originalUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (finalHost === origHost) return false;
    return PARKING_DOMAINS.has(finalHost) || Array.from(PARKING_DOMAINS).some((d) => finalHost.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * Check if HTML body content matches known parked domain patterns.
 * Runs against plain text extracted from the page.
 */
export function isParkedContent(bodyText: string): boolean {
  if (!bodyText || bodyText.length < 20) return true;
  const text = bodyText.slice(0, 5000);
  let matchCount = 0;
  for (const pattern of PARKING_TEXT_SIGNALS) {
    if (pattern.test(text)) {
      matchCount++;
      if (matchCount >= 2) return true;
    }
  }
  return false;
}

/**
 * Quick check: is this URL hosted directly on a parking provider?
 */
export function isKnownParkingUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return PARKING_DOMAINS.has(host) || Array.from(PARKING_DOMAINS).some((d) => host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
