import { AsyncLocalStorage } from "node:async_hooks";

type TikHubRequestCounter = { requests: number };

const storage = new AsyncLocalStorage<TikHubRequestCounter>();

/**
 * Runs `fn` with `counter` collecting every billed TikHub request made inside
 * it, however deep. The counter keeps what was counted when `fn` throws, so a
 * failed run can still record what it spent.
 */
export function countTikHubRequests<T>(
  counter: TikHubRequestCounter,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(counter, fn);
}

/** Called by `requestTikHub` for each billed response. */
export function recordTikHubRequest(): void {
  const counter = storage.getStore();
  if (counter) counter.requests++;
}
