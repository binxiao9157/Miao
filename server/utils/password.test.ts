import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, needsPasswordRehash, verifyPassword } from "./password";

test("password hashing never stores the plaintext password", () => {
  const hash = hashPassword("secret123");

  assert.notEqual(hash, "secret123");
  assert.match(hash, /^scrypt\$/);
  assert.equal(verifyPassword("secret123", hash), true);
  assert.equal(verifyPassword("wrong", hash), false);
});

test("legacy plaintext passwords can be verified and marked for rehash", () => {
  assert.equal(verifyPassword("secret123", "secret123"), true);
  assert.equal(verifyPassword("wrong", "secret123"), false);
  assert.equal(needsPasswordRehash("secret123"), true);
});
