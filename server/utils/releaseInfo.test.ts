import assert from "node:assert/strict";
import test from "node:test";
import { createReleaseHealth } from "./releaseInfo.ts";

test("release health exposes version, commit, and deployment capabilities", () => {
  const health = createReleaseHealth({
    nodeEnv: "production",
    dashScopeApiKey: "dash-key",
    volcApiKey: "volc-key",
  });

  assert.equal(health.status, "ok");
  assert.equal(health.env, "production");
  assert.match(health.version, /^\d+\.\d+\.\d+/);
  assert.ok(health.commit.length >= 7);
  assert.equal(health.capabilities.securityApi, true);
  assert.equal(health.capabilities.aiTasksFile, true);
  assert.equal(health.capabilities.volcengineConfigured, true);
  assert.equal(health.capabilities.dashscopeConfigured, true);
});

