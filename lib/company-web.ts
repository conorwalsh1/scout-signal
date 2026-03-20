export function getCompanySiteUrl(company: {
  website: string | null;
  domain?: string | null;
}): string | null {
  if (company.website) return company.website;
  if (company.domain) return `https://${company.domain}`;
  return null;
}

export function getCompanyLogoUrls(company: {
  name?: string | null;
  website: string | null;
  domain?: string | null;
}): string[] {
  const siteUrl = getCompanySiteUrl(company);
  const domain = company.domain ?? (siteUrl ? new URL(siteUrl).hostname.replace(/^www\./, "") : null);
  const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  const encodedName = company.name?.trim() ? encodeURIComponent(company.name.trim()) : null;
  if (!siteUrl && !domain && !encodedName) return [];

  const candidates = [
    domain && logoDevToken
      ? `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(logoDevToken)}&size=128&format=webp&retina=true`
      : null,
    encodedName && logoDevToken
      ? `https://img.logo.dev/${encodedName}?token=${encodeURIComponent(logoDevToken)}&size=128&format=webp&retina=true`
      : null,
    domain ? `https://${domain}/favicon.ico` : null,
    domain ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico` : null,
    siteUrl ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(siteUrl)}` : null,
  ].filter(Boolean) as string[];

  return Array.from(new Set(candidates));
}

export function getCompanyLogoUrl(company: {
  name?: string | null;
  website: string | null;
  domain?: string | null;
}): string | null {
  return getCompanyLogoUrls(company)[0] ?? null;
}
