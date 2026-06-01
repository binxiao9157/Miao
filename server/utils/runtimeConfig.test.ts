import assert from "node:assert/strict";
import test from "node:test";
import { readSecret } from "./runtimeConfig";

test("production secrets must be explicit and cannot use development defaults", () => {
  assert.throws(
    () => readSecret("JWT_SECRET", undefined, "miao-dev-secret-change-me", "production"),
    /JWT_SECRET/
  );

  assert.throws(
    () => readSecret("ADMIN_TOKEN", "miao_admin_8888", "miao_admin_8888", "production"),
    /ADMIN_TOKEN/
  );
});

test("development can use an explicit fallback secret", () => {
  assert.equal(
    readSecret("JWT_SECRET", undefined, "miao-dev-secret-change-me", "development"),
    "miao-dev-secret-change-me"
  );
});
