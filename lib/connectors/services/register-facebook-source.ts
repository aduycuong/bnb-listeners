import { APIError } from "@/lib/exposers/api-error";
import { registerSource } from "@/lib/raw-store/services/register-source";
import type { RegisterSourceResult } from "@/lib/raw-store/types";

import { parseFacebookSourceUrl } from "../facebook/utils/parse-facebook-source-url";

type RegisterFacebookSourceParams = {
  url: string;
  name?: string | null;
};

/** Registers a Facebook group or page in `sources` from its URL. */
export async function registerFacebookSource(
  params: RegisterFacebookSourceParams,
): Promise<RegisterSourceResult> {
  const ref = parseFacebookSourceUrl(params.url);

  if (!ref) {
    throw new APIError(
      "ERR_INVALID_SOURCE_URL",
      `Not a Facebook group or page URL: ${params.url}`,
      400,
    );
  }

  return registerSource({
    platform: "facebook",
    sourceType: ref.sourceType,
    externalId: ref.externalId,
    url: ref.canonicalUrl,
    name: params.name ?? null,
  });
}
