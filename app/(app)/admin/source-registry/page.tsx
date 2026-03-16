import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";

type SourceRegistryRow = {
  id: string;
  company_name: string;
  company_domain: string | null;
  source_type: string;
  source_key: string;
  source_url: string | null;
  active: boolean;
  last_checked_at: string | null;
  last_status: string | null;
  last_result_count: number | null;
};

export default async function AdminSourceRegistryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user?.email ?? null)) {
    notFound();
  }

  const { data, error } = await supabase
    .from("monitored_sources")
    .select(
      "id, company_name, company_domain, source_type, source_key, source_url, active, last_checked_at, last_status, last_result_count"
    )
    .order("source_type", { ascending: true })
    .order("company_name", { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(error.message ?? "Failed to load source registry");
  }

  const rows = (data ?? []) as SourceRegistryRow[];
  const countsByType = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.source_type] = (acc[row.source_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground-heading">Source Registry</h1>
          <p className="text-sm text-secondary">
            Monitored ATS boards and connector health. Seed defaults with <code>npm run db:seed-sources</code>.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-data-blue hover:underline">
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(countsByType).map(([type, count]) => (
          <span key={type} className="rounded-md border border-border bg-card px-3 py-2 text-sm text-secondary">
            <span className="font-medium text-foreground">{type}</span>: {count}
          </span>
        ))}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-sidebar/50">
                <th className="px-4 py-3 text-left font-semibold text-secondary">Company</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Source</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Key</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Results</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Last checked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{row.company_name}</div>
                    <div className="text-xs text-secondary">{row.company_domain || "No domain"}</div>
                  </td>
                  <td className="px-4 py-3 text-secondary">{row.source_type}</td>
                  <td className="px-4 py-3 text-secondary">
                    <div>{row.source_key}</div>
                    {row.source_url ? (
                      <a
                        href={row.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-data-blue hover:underline"
                      >
                        Open source
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        row.last_status === "ok"
                          ? "bg-signal-green/15 text-signal-green"
                          : row.last_status === "error"
                            ? "bg-red-500/10 text-red-300"
                            : "bg-muted text-secondary"
                      }`}
                    >
                      {row.active ? row.last_status ?? "pending" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary">{row.last_result_count ?? "—"}</td>
                  <td className="px-4 py-3 text-secondary">
                    {row.last_checked_at ? new Date(row.last_checked_at).toLocaleString("en-GB") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
