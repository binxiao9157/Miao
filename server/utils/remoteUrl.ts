import net from "net";

const PRIVATE_V4_RANGES = [
  [0x0a000000, 0x0affffff],
  [0x7f000000, 0x7fffffff],
  [0xa9fe0000, 0xa9feffff],
  [0xac100000, 0xac1fffff],
  [0xc0a80000, 0xc0a8ffff],
  [0x00000000, 0x00ffffff],
];

const parseIPv4ToNumber = (hostname: string): number | null => {
  const normalized = hostname.toLowerCase();

  if (/^0x[0-9a-f]+$/.test(normalized)) {
    const value = Number.parseInt(normalized.slice(2), 16);
    return Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff ? value : null;
  }

  if (/^\d+$/.test(normalized)) {
    const value = Number.parseInt(normalized, 10);
    return Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff ? value : null;
  }

  const parts = normalized.split(".");
  if (parts.length !== 4 || !parts.every(part => /^\d+$/.test(part))) return null;

  const octets = parts.map(part => Number.parseInt(part, 10));
  if (octets.some(octet => octet < 0 || octet > 255)) return null;
  return ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
};

const isPrivateIPv4 = (hostname: string) => {
  const address = parseIPv4ToNumber(hostname);
  if (address === null) return false;
  return PRIVATE_V4_RANGES.some(([start, end]) => address >= start && address <= end);
};

export const isBlockedRemoteHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!normalized) return true;
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (isPrivateIPv4(normalized)) return true;

  if (net.isIP(normalized) === 6) {
    return normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:");
  }

  return false;
};

export const parseSafeRemoteUrl = (rawUrl: unknown): string | null => {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  try {
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (isBlockedRemoteHostname(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};
