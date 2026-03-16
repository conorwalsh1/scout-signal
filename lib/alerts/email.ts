/**
 * Alert delivery: email (and later Slack).
 * Stub: implement actual sending (e.g. Resend, SendGrid) and call from cron pipeline
 * after new signals are written.
 */

export interface AlertPayload {
  userEmail: string;
  alertType: string;
  companyName?: string;
  companyId?: string;
  signalSummary?: string;
}

/** Stub: log only. Replace with real email send (Resend/SendGrid) to deliver alerts. */
export async function sendAlertEmail(payload: AlertPayload): Promise<{ ok: boolean; error?: string }> {
  if (process.env.NODE_ENV !== "test") {
    console.log("[alerts] Email stub:", payload);
  }
  return { ok: true };
}
