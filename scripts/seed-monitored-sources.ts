import { config } from "dotenv";
config({ path: ".env.local" });

import { upsertDefaultMonitoredSources } from "@/lib/source-registry";

async function run() {
  const count = await upsertDefaultMonitoredSources();
  console.log(`[source-registry] Seeded or updated ${count} monitored sources`);
}

if (typeof process !== "undefined" && !process.env.NEXT_RUNTIME) {
  run().catch((error) => {
    console.error("[source-registry] Fatal:", error);
    process.exit(1);
  });
}
