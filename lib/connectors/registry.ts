import { CONNECTOR_KEYS, type ConnectorKey } from "./constants";
import { facebookCommentsConnector } from "./facebook/facebook-comments-connector";
import { facebookPostRefreshConnector } from "./facebook/facebook-post-refresh-connector";
import { facebookPostsConnector } from "./facebook/facebook-posts-connector";
import { syntheticThreadsConnector } from "./synthetic/synthetic-threads-connector";
import type { Connector } from "./types";

const connectors = {
  "facebook-posts": facebookPostsConnector,
  "facebook-post-refresh": facebookPostRefreshConnector,
  "facebook-comments": facebookCommentsConnector,
  "synthetic-threads": syntheticThreadsConnector,
} satisfies Record<ConnectorKey, unknown>;

/**
 * Connector by key. Params are typed per connector; callers validate them
 * with `paramsSchema` before use, so the registry hands out `unknown` params.
 */
export function getConnector(key: string): Connector<unknown> {
  if (!CONNECTOR_KEYS.includes(key as ConnectorKey)) {
    throw new Error(`Unknown connector: ${key}`);
  }

  return connectors[key as ConnectorKey] as unknown as Connector<unknown>;
}
