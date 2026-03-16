import Link from "next/link";
import { getAlerts } from "./actions";
import { AlertsList } from "./alerts-list";
import { getSavedCompanies } from "../dashboard/data";

const ALERT_TYPE_LABELS: Record<string, string> = {
  hiring_spike: "Company has a hiring spike",
  funding: "Company raises funding",
  engineering_hires: "Company hires engineers",
  saved_company_signal: "A tracked company triggers a new signal",
};

export default async function AlertsPage() {
  const [alerts, { companies: savedCompanies }] = await Promise.all([
    getAlerts(),
    getSavedCompanies(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground-heading mb-2">Alerts</h1>
      <p className="text-secondary mb-6">
        Get notified when companies trigger signals. Alerts are delivered by email (Slack coming later).
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">Notify me when</h2>
        <ul className="space-y-1 text-sm text-secondary mb-4">
          <li>• A company has a hiring spike</li>
          <li>• A company raises funding</li>
          <li>• A company hires engineers</li>
          <li>• A saved company triggers a new signal</li>
        </ul>
        <AlertsList
          initialAlerts={alerts}
          savedCompanies={savedCompanies}
          alertTypeLabels={ALERT_TYPE_LABELS}
        />
      </section>

      <p className="text-xs text-muted-foreground">
        Alerts are sent via email when the signal pipeline runs. Ensure your email is up to date in{" "}
        <Link href="/account" className="underline hover:text-foreground">Account</Link>.
      </p>
    </div>
  );
}
