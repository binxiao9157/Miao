import assert from "node:assert/strict";
import test from "node:test";
import { isBlockedRemoteHostname, parseSafeRemoteUrl } from "./remoteUrl";

test("remote URL validation blocks local and private network targets", () => {
  assert.equal(parseSafeRemoteUrl("http://localhost:3000/private"), null);
  assert.equal(parseSafeRemoteUrl("http://127.0.0.1/private"), null);
  assert.equal(parseSafeRemoteUrl("http://10.0.0.5/private"), null);
  assert.equal(parseSafeRemoteUrl("http://172.20.0.5/private"), null);
  assert.equal(parseSafeRemoteUrl("http://192.168.1.10/private"), null);
  assert.equal(parseSafeRemoteUrl("http://[::1]/private"), null);
});

test("remote URL validation accepts normal http and https urls", () => {
  assert.equal(parseSafeRemoteUrl("https://cdn.example.com/a.mp4"), "https://cdn.example.com/a.mp4");
  assert.equal(parseSafeRemoteUrl("http://cdn.example.com/a.mp4"), "http://cdn.example.com/a.mp4");
});

test("remote hostname validation blocks encoded IPv4 forms", () => {
  assert.equal(isBlockedRemoteHostname("2130706433"), true);
  assert.equal(isBlockedRemoteHostname("0x7f000001"), true);
});
