import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { APIError } from "@/lib/exposers/api-error";

import { countTikHubRequests } from "../utils/count-tikhub-requests";
import { requestTikHub } from "./request-tikhub";

type Call = { url: URL; init: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A fetch that answers with the queued responses in order and records the calls. */
function createFetch(queue: (Response | Error)[]) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: new URL(String(input)), init: init ?? {} });
    const next = queue.shift();
    if (!next) throw new Error("fetch called more often than expected");
    if (next instanceof Error) throw next;
    return next;
  };
  return { fetchImpl, calls };
}

async function errorOf(promise: Promise<unknown>): Promise<APIError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof APIError, "expected an APIError");
    return error;
  }
  assert.fail("expected the request to fail");
}

describe("requestTikHub", () => {
  let previousKey: string | undefined;

  beforeEach(() => {
    previousKey = process.env.TIKHUB_API_KEY;
    process.env.TIKHUB_API_KEY = "test-key";
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.TIKHUB_API_KEY;
    else process.env.TIKHUB_API_KEY = previousKey;
  });

  test("counts successful responses for the enclosing counter, including before a failure", async () => {
    const { fetchImpl } = createFetch([
      jsonResponse({ code: 200, data: {} }),
      jsonResponse({ code: 200, data: {} }),
      jsonResponse({ detail: { message: "bad input" } }, 400),
    ]);
    const client = { fetchImpl, maxAttempts: 1 };
    const counter = { requests: 0 };

    await assert.rejects(
      countTikHubRequests(counter, async () => {
        await requestTikHub({ endpoint: "a", client });
        await requestTikHub({ endpoint: "b", client });
        await requestTikHub({ endpoint: "c", client });
      }),
    );

    assert.equal(counter.requests, 2);
  });

  test("sends the key and query and returns the envelope data", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse({ code: 200, request_id: "req-1", data: { ok: true } }),
    ]);

    const result = await requestTikHub({
      endpoint: "web/fetch_user_post",
      query: { secUid: "abc", count: 20, cursor: undefined },
      client: { fetchImpl },
    });

    assert.deepEqual(result, { data: { ok: true }, requestId: "req-1" });
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url.origin + calls[0].url.pathname,
      "https://api.tikhub.io/api/v1/tiktok/web/fetch_user_post",
    );
    assert.equal(calls[0].url.searchParams.get("secUid"), "abc");
    assert.equal(calls[0].url.searchParams.get("count"), "20");
    assert.equal(calls[0].url.searchParams.has("cursor"), false);
    assert.equal(
      (calls[0].init.headers as Record<string, string>).Authorization,
      "Bearer test-key",
    );
    assert.equal(calls[0].init.method, "GET");
  });

  test("posts a JSON body", async () => {
    const { fetchImpl, calls } = createFetch([jsonResponse({ data: [] })]);

    await requestTikHub({
      endpoint: "app/v3/fetch_multi_video",
      method: "POST",
      body: ["1", "2"],
      client: { fetchImpl },
    });

    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.body, JSON.stringify(["1", "2"]));
  });

  test("402 is an insufficient-balance error and is not retried", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse(
        { detail: { code: 402, message: "Insufficient balance", request_id: "req-402" } },
        402,
      ),
    ]);

    const error = await errorOf(
      requestTikHub({ endpoint: "x", client: { fetchImpl, retryDelayMs: 1 } }),
    );

    assert.equal(error.code, "ERR_TIKHUB_INSUFFICIENT_BALANCE");
    assert.match(error.message, /Insufficient balance/);
    assert.equal(calls.length, 1);
  });

  test("401 is an unauthorized error and is not retried", async () => {
    const { fetchImpl, calls } = createFetch([jsonResponse({ detail: "no" }, 401)]);

    const error = await errorOf(
      requestTikHub({ endpoint: "x", client: { fetchImpl, retryDelayMs: 1 } }),
    );

    assert.equal(error.code, "ERR_TIKHUB_UNAUTHORIZED");
    assert.equal(calls.length, 1);
  });

  test("other 4xx fail at once", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse({ detail: { message: "bad secUid" } }, 422),
    ]);

    const error = await errorOf(
      requestTikHub({ endpoint: "x", client: { fetchImpl, retryDelayMs: 1 } }),
    );

    assert.equal(error.code, "ERR_TIKHUB_REQUEST_FAILED");
    assert.match(error.message, /bad secUid/);
    assert.equal(calls.length, 1);
  });

  test("retries 429 and succeeds", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse({ detail: "slow down" }, 429),
      jsonResponse({ data: { page: 1 } }),
    ]);

    const result = await requestTikHub({
      endpoint: "x",
      client: { fetchImpl, retryDelayMs: 1 },
    });

    assert.deepEqual(result.data, { page: 1 });
    assert.equal(calls.length, 2);
  });

  test("gives up on 5xx after the attempt limit", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse({}, 503),
      jsonResponse({}, 503),
      jsonResponse({}, 503),
    ]);

    const error = await errorOf(
      requestTikHub({ endpoint: "x", client: { fetchImpl, retryDelayMs: 1 } }),
    );

    assert.equal(error.code, "ERR_TIKHUB_REQUEST_FAILED");
    assert.match(error.message, /503/);
    assert.equal(calls.length, 3);
  });

  test("retries a network error", async () => {
    const { fetchImpl, calls } = createFetch([
      new Error("socket hang up"),
      jsonResponse({ data: "ok" }),
    ]);

    const result = await requestTikHub({
      endpoint: "x",
      client: { fetchImpl, retryDelayMs: 1 },
    });

    assert.equal(result.data, "ok");
    assert.equal(calls.length, 2);
  });

  test("reports the network error once attempts run out", async () => {
    const { fetchImpl } = createFetch([new Error("down"), new Error("down")]);

    const error = await errorOf(
      requestTikHub({
        endpoint: "x",
        client: { fetchImpl, retryDelayMs: 1, maxAttempts: 2 },
      }),
    );

    assert.equal(error.code, "ERR_TIKHUB_REQUEST_FAILED");
    assert.match(error.message, /down/);
  });

  test("a non-JSON body is an invalid-response error", async () => {
    const { fetchImpl } = createFetch([new Response("<html>", { status: 200 })]);

    const error = await errorOf(
      requestTikHub({ endpoint: "x", client: { fetchImpl } }),
    );

    assert.equal(error.code, "ERR_TIKHUB_INVALID_RESPONSE");
  });

  test("fails before any request when the key is missing", async () => {
    delete process.env.TIKHUB_API_KEY;
    const { fetchImpl, calls } = createFetch([]);

    const error = await errorOf(
      requestTikHub({ endpoint: "x", client: { fetchImpl } }),
    );

    assert.equal(error.code, "ERR_TIKHUB_NOT_CONFIGURED");
    assert.equal(calls.length, 0);
  });
});
