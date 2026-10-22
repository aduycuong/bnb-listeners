import { z } from "zod";

import { APIError } from "@/lib/exposers/api-error";

import type {
  FetchTiktokUserProfileParams,
  TikHubUserProfile,
} from "../types";
import { requestTikHub } from "./request-tikhub";

const profileDataSchema = z.object({
  userInfo: z.object({
    user: z.object({
      id: z.string().min(1),
      uniqueId: z.string().min(1),
      secUid: z.string().min(1),
      nickname: z.string().nullish(),
      avatarThumb: z.string().nullish(),
      verified: z.boolean().nullish(),
    }),
    stats: z.object({ followerCount: z.number().nullish() }).nullish(),
  }),
});

/**
 * Resolves a username to the ids a channel scan needs. The numeric `id` is the
 * stable key; `secUid` is what `fetch_user_post` takes.
 */
export async function fetchTiktokUserProfile(
  params: FetchTiktokUserProfileParams,
): Promise<TikHubUserProfile> {
  const { data } = await requestTikHub({
    endpoint: "web/fetch_user_profile",
    query: { uniqueId: params.uniqueId },
    client: params.client,
  });

  const parsed = profileDataSchema.safeParse(data);
  if (!parsed.success) {
    throw new APIError(
      "ERR_TIKHUB_PROFILE_NOT_FOUND",
      `TikHub returned no profile for @${params.uniqueId}.`,
      404,
    );
  }

  const { user, stats } = parsed.data.userInfo;

  return {
    id: user.id,
    uniqueId: user.uniqueId,
    secUid: user.secUid,
    nickname: user.nickname ?? null,
    followerCount: stats?.followerCount ?? null,
    avatarUrl: user.avatarThumb ?? null,
    verified: user.verified ?? false,
  };
}
