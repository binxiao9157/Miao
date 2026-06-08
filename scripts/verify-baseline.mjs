import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "package.json",
  "server.ts",
  "src/main.tsx",
  "src/App.tsx",
  "src/context/AuthContext.tsx",
  "src/services/storage.ts",
  "src/services/ai/aiClient.ts",
  "public/service-worker.js",
  "public/manifest.json",
];

const routePattern = /app\.(get|post|put|patch|delete)\("([^"]+)"/g;
const clientRoutePattern = /<Route\s+path="([^"]+)"/g;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function countMatches(source, pattern) {
  return Array.from(source.matchAll(pattern));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
assert(missing.length === 0, `Missing required files: ${missing.join(", ")}`);

const serverSource = read("server.ts");
const appSource = read("src/App.tsx");
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));

const serverRoutes = countMatches(serverSource, routePattern).map((match) => ({
  method: match[1].toUpperCase(),
  path: match[2],
}));
const clientRoutes = countMatches(appSource, clientRoutePattern).map((match) => match[1]);

const requiredServerRoutes = [
  "/api/health",
  "/api/v1/auth/register",
  "/api/v1/auth/password-login",
  "/api/v1/cats",
  "/api/v1/diaries",
  "/api/v1/ai/tasks",
  "/api/v1/admin/stats",
  "/api/ai/generate-image",
  "/api/ai/generate-video",
];

const requiredClientRoutes = [
  "/login",
  "/register",
  "/empty-cat",
  "/generation-progress",
  "/",
  "/diary",
  "/profile",
];

for (const route of requiredServerRoutes) {
  assert(serverRoutes.some((item) => item.path === route), `Missing server route: ${route}`);
}

for (const route of requiredClientRoutes) {
  assert(clientRoutes.includes(route), `Missing client route: ${route}`);
}

assert(packageJson.scripts?.dev, "Missing package script: dev");
assert(packageJson.scripts?.build, "Missing package script: build");

const routerDomRange = packageJson.dependencies?.["react-router-dom"];
const lockedRouterDomRange = packageLock.packages?.[""]?.dependencies?.["react-router-dom"];
const lockedRouterDomVersion = packageLock.packages?.["node_modules/react-router-dom"]?.version;
const lockedRouterVersion = packageLock.packages?.["node_modules/react-router"]?.version;
const minRouterVersion = "7.17.0";

function parseVersion(version) {
  const match = String(version || "").match(/\d+\.\d+\.\d+/);
  assert(match, `Invalid semver version: ${version}`);
  return match[0].split(".").map((part) => Number(part));
}

function isAtLeast(actual, minimum) {
  const actualParts = parseVersion(actual);
  const minimumParts = parseVersion(minimum);
  for (let index = 0; index < minimumParts.length; index += 1) {
    if (actualParts[index] > minimumParts[index]) return true;
    if (actualParts[index] < minimumParts[index]) return false;
  }
  return true;
}

assert(routerDomRange, "Missing dependency: react-router-dom");
assert(
  routerDomRange === lockedRouterDomRange,
  `package-lock root react-router-dom range (${lockedRouterDomRange}) does not match package.json (${routerDomRange})`,
);
assert(
  isAtLeast(routerDomRange, minRouterVersion),
  `react-router-dom dependency must be >= ${minRouterVersion}; found ${routerDomRange}`,
);
assert(
  isAtLeast(lockedRouterDomVersion, minRouterVersion),
  `package-lock react-router-dom must be >= ${minRouterVersion}; found ${lockedRouterDomVersion}`,
);
assert(
  isAtLeast(lockedRouterVersion, minRouterVersion),
  `package-lock react-router must be >= ${minRouterVersion}; found ${lockedRouterVersion}`,
);

const summary = {
  ok: true,
  package: packageJson.name,
  scripts: Object.keys(packageJson.scripts || {}),
  dependencies: {
    "react-router-dom": lockedRouterDomVersion,
    "react-router": lockedRouterVersion,
  },
  serverRouteCount: serverRoutes.length,
  clientRouteCount: clientRoutes.length,
  checkedFiles: requiredFiles.length,
};

console.log(JSON.stringify(summary, null, 2));
