import assert from "node:assert/strict";
import test from "node:test";
import {
  checkMediaSafety,
  checkTextSafety,
  createSafetyPass,
} from "./contentSafety.ts";

test("text safety passes empty or ordinary content", () => {
  assert.equal(checkTextSafety("", "comment").passed, true);
  assert.equal(checkTextSafety("今天和小猫一起晒太阳", "diary").passed, true);
});

test("text safety rejects locally blocked content", () => {
  const result = checkTextSafety("这里包含赌博引导", "feedback");

  assert.equal(result.passed, false);
  assert.equal(result.safe, false);
  assert.equal(result.code, "LOCAL_TEXT_REJECTED");
  assert.deepEqual(result.labels, ["gambling"]);
});

test("media safety validates urls and media types", () => {
  assert.equal(checkMediaSafety({ mediaUrl: "https://cdn.example.com/cat.png", mediaType: "image", scene: "cat_upload" }).passed, true);
  assert.equal(checkMediaSafety({ mediaUrl: "ftp://cdn.example.com/cat.png", mediaType: "image", scene: "cat_upload" }).passed, false);
  assert.equal(checkMediaSafety({ mediaUrl: "https://cdn.example.com/cat.txt", mediaType: "document" as any, scene: "cat_upload" }).passed, false);
});

test("media safety rejects oversized uploaded files", () => {
  const result = checkMediaSafety({
    mediaType: "video",
    scene: "diary",
    file: {
      mimetype: "video/mp4",
      size: 25 * 1024 * 1024,
      originalname: "cat.mp4",
    },
  });

  assert.equal(result.passed, false);
  assert.equal(result.code, "MEDIA_TOO_LARGE");
});

test("safety pass response keeps mini program compatible fields", () => {
  const result = createSafetyPass("profile");

  assert.equal(result.passed, true);
  assert.equal(result.safe, true);
  assert.equal(result.scene, "profile");
  assert.equal(Array.isArray(result.labels), true);
});
