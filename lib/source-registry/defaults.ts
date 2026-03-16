export interface DefaultMonitoredSource {
  company_name: string;
  company_domain?: string | null;
  source_type: string;
  source_key: string;
  source_url?: string | null;
  metadata_json?: Record<string, unknown>;
}

export const DEFAULT_MONITORED_SOURCES: DefaultMonitoredSource[] = [
  { company_name: "Stripe", company_domain: "stripe.com", source_type: "greenhouse_hiring", source_key: "stripe", source_url: "https://boards.greenhouse.io/stripe" },
  { company_name: "Notion", company_domain: "notion.so", source_type: "greenhouse_hiring", source_key: "notion", source_url: "https://boards.greenhouse.io/notion" },
  { company_name: "Figma", company_domain: "figma.com", source_type: "greenhouse_hiring", source_key: "figma", source_url: "https://boards.greenhouse.io/figma" },
  { company_name: "Asana", company_domain: "asana.com", source_type: "greenhouse_hiring", source_key: "asana", source_url: "https://boards.greenhouse.io/asana" },
  { company_name: "Dropbox", company_domain: "dropbox.com", source_type: "greenhouse_hiring", source_key: "dropbox", source_url: "https://boards.greenhouse.io/dropbox" },
  { company_name: "Reddit", company_domain: "reddit.com", source_type: "greenhouse_hiring", source_key: "reddit", source_url: "https://boards.greenhouse.io/reddit" },
  { company_name: "Twitch", company_domain: "twitch.tv", source_type: "greenhouse_hiring", source_key: "twitch", source_url: "https://boards.greenhouse.io/twitch" },
  { company_name: "Robinhood", company_domain: "robinhood.com", source_type: "greenhouse_hiring", source_key: "robinhood", source_url: "https://boards.greenhouse.io/robinhood" },
  { company_name: "Squarespace", company_domain: "squarespace.com", source_type: "greenhouse_hiring", source_key: "squarespace", source_url: "https://boards.greenhouse.io/squarespace" },
  { company_name: "Datadog", company_domain: "datadog.com", source_type: "greenhouse_hiring", source_key: "datadog", source_url: "https://boards.greenhouse.io/datadog" },
  { company_name: "Duolingo", company_domain: "duolingo.com", source_type: "greenhouse_hiring", source_key: "duolingo", source_url: "https://boards.greenhouse.io/duolingo" },
  { company_name: "Zapier", company_domain: "zapier.com", source_type: "greenhouse_hiring", source_key: "zapier", source_url: "https://boards.greenhouse.io/zapier" },
  { company_name: "Gusto", company_domain: "gusto.com", source_type: "greenhouse_hiring", source_key: "gusto", source_url: "https://boards.greenhouse.io/gusto" },
  { company_name: "Aircall", company_domain: "aircall.io", source_type: "greenhouse_hiring", source_key: "aircall", source_url: "https://boards.greenhouse.io/aircall" },
  { company_name: "Pleo", company_domain: "pleo.io", source_type: "greenhouse_hiring", source_key: "pleo", source_url: "https://boards.greenhouse.io/pleo" },
  { company_name: "Remote", company_domain: "remote.com", source_type: "greenhouse_hiring", source_key: "remote", source_url: "https://boards.greenhouse.io/remote" },
  { company_name: "Sourcegraph", company_domain: "sourcegraph.com", source_type: "greenhouse_hiring", source_key: "sourcegraph", source_url: "https://boards.greenhouse.io/sourcegraph" },
  { company_name: "Retool", company_domain: "retool.com", source_type: "greenhouse_hiring", source_key: "retool", source_url: "https://boards.greenhouse.io/retool" },
  { company_name: "Vercel", company_domain: "vercel.com", source_type: "greenhouse_hiring", source_key: "vercel", source_url: "https://boards.greenhouse.io/vercel" },
  { company_name: "Linear", company_domain: "linear.app", source_type: "greenhouse_hiring", source_key: "linear", source_url: "https://boards.greenhouse.io/linear" },

  { company_name: "Monzo", company_domain: "monzo.com", source_type: "lever_hiring", source_key: "monzo", source_url: "https://jobs.lever.co/monzo" },
  { company_name: "ClearBank", company_domain: "clear.bank", source_type: "lever_hiring", source_key: "clearbank", source_url: "https://jobs.lever.co/clearbank" },
  { company_name: "Remote", company_domain: "remote.com", source_type: "lever_hiring", source_key: "remotecom", source_url: "https://jobs.lever.co/remotecom" },
  { company_name: "Moneybox", company_domain: "moneyboxapp.com", source_type: "lever_hiring", source_key: "moneyboxapp", source_url: "https://jobs.lever.co/moneyboxapp" },
  { company_name: "Zilch", company_domain: "payzilch.com", source_type: "lever_hiring", source_key: "zilch", source_url: "https://jobs.lever.co/zilch" },

  { company_name: "Figma", company_domain: "figma.com", source_type: "ashby_hiring", source_key: "figma", source_url: "https://jobs.ashbyhq.com/figma" },
  { company_name: "Vercel", company_domain: "vercel.com", source_type: "ashby_hiring", source_key: "vercel", source_url: "https://jobs.ashbyhq.com/vercel" },
  { company_name: "Notion", company_domain: "notion.so", source_type: "ashby_hiring", source_key: "notion", source_url: "https://jobs.ashbyhq.com/notion" },
  { company_name: "Remote", company_domain: "remote.com", source_type: "ashby_hiring", source_key: "remote", source_url: "https://jobs.ashbyhq.com/remote" },
  { company_name: "Monzo", company_domain: "monzo.com", source_type: "ashby_hiring", source_key: "monzo", source_url: "https://jobs.ashbyhq.com/monzo" },
];
