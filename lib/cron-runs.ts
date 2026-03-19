import { createServiceClient } from "@/lib/supabase/service";

export type CronRunStatus = "started" | "succeeded" | "failed";
export type CronTriggerSource = "vercel_cron" | "manual_auth" | "manual_query" | "unknown";

type CronRunDetails = Record<string, unknown>;

function getService() {
  return createServiceClient();
}

export async function createCronRun(input: {
  jobName: string;
  triggerSource: CronTriggerSource;
  deploymentHost?: string | null;
  details?: CronRunDetails;
}): Promise<string | null> {
  try {
    const supabase = getService();
    const { data, error } = await supabase
      .from("cron_runs")
      .insert({
        job_name: input.jobName,
        trigger_source: input.triggerSource,
        status: "started",
        deployment_host: input.deploymentHost ?? null,
        details_json: input.details ?? {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("[cron-runs] create failed", error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error("[cron-runs] create threw", error);
    return null;
  }
}

export async function completeCronRun(input: {
  id: string | null;
  status: Exclude<CronRunStatus, "started">;
  details?: CronRunDetails;
}): Promise<void> {
  if (!input.id) return;

  try {
    const supabase = getService();
    const { error } = await supabase
      .from("cron_runs")
      .update({
        status: input.status,
        finished_at: new Date().toISOString(),
        details_json: input.details ?? {},
      })
      .eq("id", input.id);

    if (error) console.error("[cron-runs] complete failed", error);
  } catch (error) {
    console.error("[cron-runs] complete threw", error);
  }
}

