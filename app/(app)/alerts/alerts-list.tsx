"use client";

import { useCallback, useState } from "react";
import { createAlert, deleteAlert } from "./actions";
import { Button } from "@/components/ui/button";
import type { UserAlert, UserAlertType } from "@/types/database";

interface SavedCompany {
  id: string;
  name: string;
}

interface AlertsListProps {
  initialAlerts: UserAlert[];
  savedCompanies: SavedCompany[];
  alertTypeLabels: Record<string, string>;
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

export function AlertsList({ initialAlerts, savedCompanies, alertTypeLabels }: AlertsListProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [addingType, setAddingType] = useState<UserAlertType | null>(null);
  const [companyId, setCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(
    async (alertType: UserAlertType) => {
      setError(null);
      setLoading(true);
      const res = await createAlert({
        alert_type: alertType,
        company_id: alertType === "saved_company_signal" && companyId ? companyId : null,
        channel: "email",
      });
      setLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setAddingType(null);
      setCompanyId("");
      if (res.alert) setAlerts((prev) => [res.alert!, ...prev]);
    },
    [companyId]
  );

  const handleDelete = useCallback(async (id: string) => {
    const res = await deleteAlert(id);
    if (!res.error) setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const hasGlobalAlert = (type: UserAlertType) =>
    alerts.some((a) => a.alert_type === type && !a.company_id);

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-border bg-card/30 p-4 space-y-4">
        <p className="text-sm font-medium text-foreground">Add alert</p>
        <div className="flex flex-wrap gap-2">
          {(
            ["hiring_spike", "funding", "engineering_hires", "saved_company_signal"] as UserAlertType[]
          ).map((type) => {
            if (addingType === type) {
              return (
                <div key={type} className="flex flex-wrap items-center gap-2 rounded-md border border-signal-green/30 bg-signal-green/5 px-3 py-2">
                  <span className="text-sm text-foreground">{alertTypeLabels[type]}</span>
                  {type === "saved_company_signal" && savedCompanies.length > 0 && (
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="rounded border border-border bg-sidebar px-2 py-1 text-sm"
                    >
                      <option value="">Any tracked company</option>
                      {savedCompanies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleAdd(type)}
                    disabled={loading}
                    className="bg-signal-green text-black hover:bg-signal-green/90"
                  >
                    {loading ? "Adding…" : "Add"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setAddingType(null); setCompanyId(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              );
            }
            const disabled = type !== "saved_company_signal" && hasGlobalAlert(type);
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => setAddingType(type)}
                disabled={disabled}
                className="text-sm"
              >
                + {alertTypeLabels[type]}
              </Button>
            );
          })}
        </div>
      </div>

      {alerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Your alerts</h3>
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card/50 px-4 py-3 text-sm"
              >
                <div>
                  <span className="text-foreground">{alertTypeLabels[alert.alert_type] ?? alert.alert_type}</span>
                  {alert.company_id && (
                    <span className="ml-2 text-secondary">
                      ({savedCompanies.find((c) => c.id === alert.company_id)?.name ?? "specific company"})
                    </span>
                  )}
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Via {alert.channel}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(alert.id)}
                  className="text-secondary hover:text-red-400 shrink-0"
                  aria-label="Delete alert"
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alerts.length === 0 && (
        <p className="text-sm text-secondary">
          No alerts yet. Click an option above to get notified.
        </p>
      )}
    </div>
  );
}
