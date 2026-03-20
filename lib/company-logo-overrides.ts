const COMPANY_LOGO_OVERRIDES: Record<string, string[]> = {
  "figma": [
    "https://static.figma.com/app/icon/2/icon-128.png",
  ],
  "gusto": [
    "https://www.google.com/s2/favicons?sz=128&domain_url=https://gusto.com/",
  ],
  "monzo": [
    "https://static-assets.monzo.com/monzo-com/b6de7f737103af8a871160a3ea3cc1a8f866eec1/_next/static/media/favicon.87a9df8c.png",
  ],
  "oaknorth": [
    "https://oaknorth.com/wp-content/uploads/sites/3/2025/11/ON-Logo-Site-icon-transparent-2-100x100.png",
  ],
  "wise": [
    "https://attraxcdnprod1-freshed3dgayb7c3.z01.azurefd.net/1481206/dd8bf376-7a75-43b5-8223-2248b4dcd27d/2023.17000.2078/Blob/favicon.ico",
  ],
};

function normalizeCompanyKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function getCompanyLogoOverrideUrls(company: {
  name?: string | null;
  domain?: string | null;
}): string[] {
  const keys = [
    normalizeCompanyKey(company.domain?.replace(/^www\./, "")),
    normalizeCompanyKey(company.name),
  ].filter(Boolean) as string[];

  for (const key of keys) {
    const urls = COMPANY_LOGO_OVERRIDES[key];
    if (urls?.length) return urls;
  }

  return [];
}
