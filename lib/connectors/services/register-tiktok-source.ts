import { APIError } from "@/lib/exposers/api-error";
import { registerSource } from "@/lib/raw-store/services/register-source";
import { updateSourceDetails } from "@/lib/raw-store/services/update-source-details";
import type { RegisterSourceResult } from "@/lib/raw-store/types";
import { fetchTiktokUserProfile } from "@/lib/tikhub/services/fetch-tiktok-user-profile";
import type { TikHubClientOptions } from "@/lib/tikhub/types";

import { buildTiktokProfileUrl } from "../tiktok/utils/build-tiktok-video-url";
import { parseTiktokSourceUrl } from "../tiktok/utils/parse-tiktok-source-url";

type RegisterTiktokSourceParams = {
  url: string;
  name?: string | null;
  client?: TikHubClientOptions;
};

type RegisterTiktokSourceResult = RegisterSourceResult & {
  uniqueId: string;
  secUid: string;
};

/**
 * Registers a TikTok channel in `sources` from its profile URL. One TikHub
 * request resolves the numeric account id (the stable `external_id`, which
 * survives a username change) and the `secUid` the post scan needs; both ids
 * and the follower count are refreshed when the source already exists.
 */
export async function registerTiktokSource(
  params: RegisterTiktokSourceParams,
): Promise<RegisterTiktokSourceResult> {
  const ref = parseTiktokSourceUrl(params.url);

  if (!ref) {
    throw new APIError(
      "ERR_INVALID_SOURCE_URL",
      `Not a TikTok channel URL: ${params.url}`,
      400,
    );
  }

  const profile = await fetchTiktokUserProfile({
    uniqueId: ref.uniqueId,
    client: params.client,
  });
  const uniqueId = profile.uniqueId.toLowerCase();

  const registered = await registerSource({
    platform: "tiktok",
    sourceType: "channel",
    externalId: profile.id,
    url: buildTiktokProfileUrl(uniqueId),
    name: params.name ?? profile.nickname,
    metadata: { uniqueId, secUid: profile.secUid },
  });

  await updateSourceDetails({
    sourceId: registered.sourceId,
    followerCount: profile.followerCount,
    metadata: { uniqueId, secUid: profile.secUid },
  });

  return { ...registered, uniqueId, secUid: profile.secUid };
}
