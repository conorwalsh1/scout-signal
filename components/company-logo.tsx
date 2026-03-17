"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { getCompanyLogoUrls } from "@/lib/company-web";

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export function CompanyLogo({
  name,
  website,
  domain,
  className = "h-full w-full object-contain",
  fallbackClassName = "text-xs font-semibold text-signal-green uppercase",
}: {
  name: string;
  website: string | null;
  domain?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const sources = useMemo(() => getCompanyLogoUrls({ website, domain }), [website, domain]);
  const [index, setIndex] = useState(0);
  const src = sources[index] ?? null;

  if (!src) {
    return <span className={fallbackClassName}>{getInitials(name)}</span>;
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setIndex((current) => current + 1)}
    />
  );
}
