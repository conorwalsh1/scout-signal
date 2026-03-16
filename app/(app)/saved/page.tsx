import Link from "next/link";
import { getSavedCompanies } from "../dashboard/data";
import { TrackedCompaniesList } from "./tracked-list";
import { Button } from "@/components/ui/button";

export default async function SavedPage() {
  const { companies, plan, savedLimitReached } = await getSavedCompanies();
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground-heading mb-2">Tracked Companies</h1>
      <p className="text-secondary mb-6">
        Save companies to track them and get updates.
      </p>
      {plan === "basic" && savedLimitReached && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            You&apos;ve reached the Basic limit of 10 saved companies.
          </p>
          <Link href="/pricing">
            <Button size="sm">Upgrade to Pro</Button>
          </Link>
        </div>
      )}
      <TrackedCompaniesList initialCompanies={companies} />
    </div>
  );
}
