import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export type ReleaseHealth = {
  status: "ok";
  timestamp: string;
  env: string | undefined;
  version: string;
  commit: string;
  hasApiKey: boolean;
  capabilities: {
    auth: boolean;
    upload: boolean;
    securityApi: boolean;
    mediaSecurityApi: boolean;
    aiTasks: boolean;
    aiTasksFile: boolean;
    aiTaskPolling: boolean;
    assetPersistence: boolean;
    dashscopeConfigured: boolean;
    volcengineConfigured: boolean;
  };
};

type ReleaseHealthInput = {
  nodeEnv?: string;
  dashScopeApiKey?: string;
  volcApiKey?: string;
};

function readVersion(): string {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
    );
    return String(packageJson.version || "0.0.0");
  } catch {
    return "0.0.0";
  }
}

function readCommit(): string {
  const envCommit = process.env.MIAO_RELEASE_COMMIT || process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA;
  if (envCommit) return String(envCommit).slice(0, 12);

  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

export function createReleaseHealth(input: ReleaseHealthInput = {}): ReleaseHealth {
  const dashscopeConfigured = !!input.dashScopeApiKey;
  const volcengineConfigured = !!input.volcApiKey;

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    env: input.nodeEnv,
    version: readVersion(),
    commit: readCommit(),
    hasApiKey: dashscopeConfigured || volcengineConfigured,
    capabilities: {
      auth: true,
      upload: true,
      securityApi: true,
      mediaSecurityApi: true,
      aiTasks: true,
      aiTasksFile: true,
      aiTaskPolling: true,
      assetPersistence: true,
      dashscopeConfigured,
      volcengineConfigured,
    },
  };
}
