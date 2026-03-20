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
  "hopin": [
    "https://cdn.prod.website-files.com/63696c1ead1d4f3e79645931/636a1f69243b24e2b80a97bf_favicon.svg",
  ],
  "evaconsultingsolutions.com": [
    "https://www.evaconsultingsolutions.com/favicon.ico",
  ],
  "paceuathletics.com": [
    "https://images.sidearmdev.com/convert?url=https%3a%2f%2fdxbhsrqyrr690.cloudfront.net%2fsidearm.nextgen.sites%2fpacesettersathletics.com%2fimages%2flogos%2fsite%2fsite.png&type=webp",
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
