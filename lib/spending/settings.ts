import { z } from "zod";

import type { SettingDefinition, SettingField } from "@/lib/settings/types";

import { BILLING_UNITS, SPENDING_PROVIDER_KEYS, SPENDING_PROVIDERS, type SpendingProviderKey } from "./config";

const providerPricingSchema = z.object({
  /** USD per 1,000 billed units (records or requests). */
  pricePer1k: z.number().min(0).max(1000),
  /** USD per calendar month (UTC); 0 = no budget. */
  monthlyBudget: z.number().min(0).max(1_000_000),
});

export type ProviderPricing = z.infer<typeof providerPricingSchema>;

const spendingPricingSchema = z.object({
  brightData: providerPricingSchema,
  tikhub: providerPricingSchema,
}) satisfies z.ZodType<Record<SpendingProviderKey, ProviderPricing>>;

export const spendingPricingSetting = {
  label: "Spending prices",
  description:
    "Unit prices of the paid data providers, used by /admin/spending. A change applies to past runs too: spending is always units × the current price.",
  schema: spendingPricingSchema,
  defaultValue: Object.fromEntries(
    SPENDING_PROVIDER_KEYS.map((key) => [
      key,
      { pricePer1k: SPENDING_PROVIDERS[key].defaultPricePer1k, monthlyBudget: 0 },
    ]),
  ) as z.infer<typeof spendingPricingSchema>,
  fields: SPENDING_PROVIDER_KEYS.flatMap((key): SettingField[] => {
    const provider = SPENDING_PROVIDERS[key];
    const unit = BILLING_UNITS[provider.billing].label;

    return [
      {
        path: `${key}.pricePer1k`,
        label: `${provider.label}: price`,
        description: `Billed per ${provider.billing}.`,
        unit: `USD / 1,000 ${unit}`,
        kind: "number",
      },
      {
        path: `${key}.monthlyBudget`,
        label: `${provider.label}: monthly budget`,
        description: "Compared with the month-end forecast; 0 = no budget.",
        unit: "USD",
        kind: "number",
      },
    ];
  }),
} satisfies SettingDefinition<typeof spendingPricingSchema>;
