import type { ConnectorKey } from "@/lib/connectors/constants";

/**
 * How a provider bills, and where a collect run keeps that count:
 * - `record`: per delivered record, `collect_runs.item_count` (Bright Data).
 * - `request`: per API request, `collect_runs.stats.requests` (TikHub).
 * A new billing kind needs a column or stats key here and in `getAdminSpending`.
 */
export const BILLING_UNITS = {
  record: { label: "records" },
  request: { label: "requests" },
} as const;

export type BillingUnit = keyof typeof BILLING_UNITS;

export type SpendingProviderDefinition = {
  label: string;
  billing: BillingUnit;
  /** Runs of these connectors are billed by this provider. */
  connectors: readonly ConnectorKey[];
  /** Chart color, a CSS color. */
  color: string;
  /** Code defaults of the prices in `/admin/settings` (`spending-pricing`). */
  defaultPricePer1k: number;
};

/**
 * Paid data providers. To add one: add it here and to the `spending-pricing`
 * schema in `./settings.ts`; the spending page and the settings form follow.
 * Prices from docs/plan.md (Bright Data, about $1.5 per 1,000 records) and D19
 * (TikHub, $0.001 to $0.01 per request depending on the endpoint).
 */
export const SPENDING_PROVIDERS = {
  brightData: {
    label: "Bright Data",
    billing: "record",
    connectors: ["facebook-posts", "facebook-post-refresh", "facebook-comments"],
    color: "var(--chart-1)",
    defaultPricePer1k: 1.5,
  },
  tikhub: {
    label: "TikHub",
    billing: "request",
    connectors: ["tiktok-posts", "tiktok-search", "tiktok-post-refresh", "tiktok-comments"],
    color: "var(--chart-2)",
    defaultPricePer1k: 1,
  },
} as const satisfies Record<string, SpendingProviderDefinition>;

export type SpendingProviderKey = keyof typeof SPENDING_PROVIDERS;

export const SPENDING_PROVIDER_KEYS = Object.keys(SPENDING_PROVIDERS) as SpendingProviderKey[];

export const SPENDING_CONFIG = {
  currency: "USD",
  /** Ranges the page offers, in days ending today (UTC). */
  rangeDays: [7, 30, 90],
  defaultRangeDays: 30,
  /** The month-end forecast extends the average daily spend of this many full days. */
  runRateDays: 7,
} as const;
