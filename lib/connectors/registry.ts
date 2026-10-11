import { CONNECTOR_KEYS, type ConnectorKey } from "./constants";
import { facebookCommentsConnector } from "./facebook/facebook-comments-connector";
import { facebookPostsConnector } from "./facebook/facebook-posts-connector";
import type { Connector } from "./types";

const connectors = {
  "facebook-posts": facebookPostsConnector,
  "facebook-comments": facebookCommentsConnector,
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
