import crypto from "crypto";

export type TokenPayload = {
  username: string;
};

type TokenServiceOptions = {
  secret: string;
  ttlMs: number;
};

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64url");

export function createTokenService({ secret, ttlMs }: TokenServiceOptions) {
  const signToken = (payload: Record<string, any>) => {
    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + ttlMs }));
    const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${sig}`;
  };

  const verifyToken = (token: string): TokenPayload | null => {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const expected = crypto.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest("base64url");
    if (expected.length !== parts[2].length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) return null;

    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      if (!payload?.username || Number(payload.exp || 0) < Date.now()) return null;
      return { username: payload.username };
    } catch {
      return null;
    }
  };

  return { signToken, verifyToken };
}
