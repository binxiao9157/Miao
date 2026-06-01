import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const serverSource = fs.readFileSync(path.resolve(process.cwd(), "server.ts"), "utf8");

test("server does not keep public legacy user-id data routes", () => {
  const legacyRoutes = [
    'app.get("/api/cats/:userId"',
    'app.post("/api/cats"',
    'app.delete("/api/cats/:userId',
    'app.get("/api/diaries/:userId"',
    'app.post("/api/diaries"',
    'app.delete("/api/diaries/:userId',
    'app.get("/api/letters/:userId"',
    'app.post("/api/letters"',
    'app.delete("/api/letters/:userId',
    'app.get("/api/points/:userId"',
    'app.post("/api/points"',
    'app.post("/api/points/:userId/transaction"',
  ];

  for (const route of legacyRoutes) {
    assert.equal(serverSource.includes(route), false, `legacy route still registered: ${route}`);
  }
});

test("server does not expose legacy unauthenticated persist-video route", () => {
  assert.equal(serverSource.includes('app.post("/api/persist-video"'), false);
  assert.match(serverSource, /app\.post\("\/api\/v1\/assets\/persist-video", authRequired, persistVideoHandler\)/);
});

test("production security defaults are not embedded in server startup", () => {
  assert.equal(serverSource.includes('"miao-dev-secret-change-me"'), false);
  assert.equal(serverSource.includes('"miao_admin_8888"'), false);
});

test("points transaction does not allow reason text to bypass gain limits", () => {
  assert.equal(serverSource.includes("reason.includes('调试')"), false);
  assert.equal(serverSource.includes("reason.includes('Cheat')"), false);
});
