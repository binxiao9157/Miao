import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, needsPasswordRehash, verifyPassword } from "./password";

test("hashPassword stores non-plaintext verifiable passwords", () => {
  const password = "secret123";
  const hash = hashPassword(password);

  assert.notEqual(hash, password);
  assert.equal(hash.startsWith("scrypt$1$"), true);
  assert.equal(verifyPassword(password, hash), true);
  assert.equal(verifyPassword("wrong", hash), false);
});

test("legacy plaintext passwords still verify and request rehash", () => {
  assert.equal(needsPasswordRehash("legacy-password"), true);
  assert.equal(verifyPassword("legacy-password", "legacy-password"), true);
  assert.equal(verifyPassword("other", "legacy-password"), false);
});
