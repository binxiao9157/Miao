import assert from "node:assert/strict";
import test from "node:test";

import {
  createAiUpstreamUnavailableError,
  isAiServerMockFallbackAllowed,
} from "./aiMockPolicy";

test("server AI mock fallback is disabled by default in production", () => {
  assert.equal(isAiServerMockFallbackAllowed({ NODE_ENV: "production" }), false);
});

test("server AI mock fallback requires an explicit server flag", () => {
  assert.equal(
    isAiServerMockFallbackAllowed({
      NODE_ENV: "production",
      MIAO_SERVER_AI_MOCK_MODE: "true",
    }),
    true
  );
});

test("AI upstream errors expose a 502 response instead of a mock task", () => {
  const error = createAiUpstreamUnavailableError("image", "volcengine", "quota exceeded");
  assert.equal(error.response.status, 502);
  assert.equal(error.response.data.code, "AI_UPSTREAM_UNAVAILABLE");
  assert.equal(error.response.data.type, "image");
  assert.equal(error.response.data.provider, "volcengine");
  assert.equal(error.response.data.retryable, true);
});
