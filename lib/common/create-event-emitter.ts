import mitt from "mitt";

/** Typed pub/sub for client or isomorphic modules. See https://github.com/developit/mitt */
export function createEventEmitter<
  Events extends Record<string, unknown>,
>() {
  return mitt<Events>();
}
