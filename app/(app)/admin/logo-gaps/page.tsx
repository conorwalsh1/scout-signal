import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";

type LogoGapRow = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  company_sources:
    | Array<{
        source_type: string | null;
        source_external_id: string | null;
        metadata_json: Record<string, unknown> | null;
      }>
    | null;
};

function getFt1000Details(row: LogoGapRow) {
  const source = row.company_sources?.find((entry) => entry.source_type === "ft1000") ?? null;
  const metadata = source?.metadata_json ?? {};
  return {
    rank: source?.source_external_id ?? "—",
    headquarters: typeof metadata.headquarters === "string" ? metadata.headquarters : "—",
    category: typeof metadata.category === "string" ? metadata.category : "—",
  };
}

export default async function AdminLogoGapsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user?.email ?? null)) {
    notFound();
  }

  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, name, website, domain, company_sources(source_type, source_external_id, metadata_json)"
    )
    .or("website.is.null,domain.is.null")
    .order("created_at", { ascending: true })
    .limit(250);

  if (error) {
    throw new Error(error.message ?? "Failed to load logo gaps");
  }

  const rows = (data ?? []) as LogoGapRow[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground-heading">Logo Gaps</h1>
          <p className="text-sm text-secondary">
            Companies most likely to fall back to initials because they still lack a clean website or domain.
          </p>
        </div>
        <Link
          href="/companies"
          className="text-sm text-data-blue hover:underline"
        >
          Back to companies
        </Link>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-sidebar/50">
                <th className="px-4 py-3 text-left font-semibold text-secondary">Company</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">FT1000 Rank</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Headquarters</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Current Web Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const details = getFt1000Details(row);
                return (
                  <tr key={row.id} className="border-b border-border align-top">
                    <td className="px-4 py-3">
                      <Link href={`/companies/${row.id}`} className="font-medium text-foreground hover:text-signal-green">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-secondary">{details.rank}</td>
                    <td className="px-4 py-3 text-secondary">{details.headquarters}</td>
                    <td className="px-4 py-3 text-secondary">{details.category}</td>
                    <td className="px-4 py-3 text-secondary">
                      <div>{row.website || "No website"}</div>
                      <div>{row.domain || "No domain"}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
