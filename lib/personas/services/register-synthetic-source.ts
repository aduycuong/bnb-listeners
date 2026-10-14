import { registerSource } from "@/lib/raw-store/services/register-source";
import type { RegisterSourceResult } from "@/lib/raw-store/types";

import { stripDiacritics } from "../utils/strip-diacritics";

type RegisterSyntheticSourceParams = {
  name: string;
};

/**
 * A fake Facebook group in `sources`, shaped like a real one so downstream
 * code sees no difference. The same name returns the same source.
 */
export async function registerSyntheticSource(
  params: RegisterSyntheticSourceParams,
): Promise<RegisterSourceResult> {
  const slug = stripDiacritics(params.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error(`Cannot build a source id from name "${params.name}".`);
  }

  return registerSource({
    platform: "facebook",
    sourceType: "group",
    externalId: `syn-group:${slug}`,
    name: params.name,
    origin: "synthetic",
    metadata: { synthetic: true },
  });
}
