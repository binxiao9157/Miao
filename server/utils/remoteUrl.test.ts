import assert from "node:assert/strict";
import test from "node:test";
import { parseSafeRemoteUrl } from "./remoteUrl";

test("parseSafeRemoteUrl rejects private and local addresses", () => {
  assert.equal(parseSafeRemoteUrl("http://localhost/file.mp4"), null);
  assert.equal(parseSafeRemoteUrl("http://127.0.0.1/file.mp4"), null);
  assert.equal(parseSafeRemoteUrl("http://10.0.0.1/file.mp4"), null);
  assert.equal(parseSafeRemoteUrl("http://192.168.1.2/file.mp4"), null);
  assert.equal(parseSafeRemoteUrl("http://172.16.0.1/file.mp4"), null);
  assert.equal(parseSafeRemoteUrl("http://[::1]/file.mp4"), null);
});

test("parseSafeRemoteUrl accepts public http and https urls", () => {
  assert.equal(parseSafeRemoteUrl("https://example.com/a.mp4"), "https://example.com/a.mp4");
  assert.equal(parseSafeRemoteUrl("http://example.com/a.mp4"), "http://example.com/a.mp4");
});
