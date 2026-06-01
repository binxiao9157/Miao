import crypto from "crypto";

const SCHEME = "scrypt";
const VERSION = "1";
const KEY_LENGTH = 64;

const encode = (value: Buffer) => value.toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url");

const timingSafeStringEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${SCHEME}$${VERSION}$${encode(salt)}$${encode(hash)}`;
};

export const needsPasswordRehash = (storedPassword: string) => {
  return !storedPassword.startsWith(`${SCHEME}$${VERSION}$`);
};

export const verifyPassword = (password: string, storedPassword: string) => {
  if (!storedPassword) return false;

  if (needsPasswordRehash(storedPassword)) {
    return timingSafeStringEqual(password, storedPassword);
  }

  const [, version, saltValue, hashValue] = storedPassword.split("$");
  if (version !== VERSION || !saltValue || !hashValue) return false;

  try {
    const salt = decode(saltValue);
    const storedHash = decode(hashValue);
    const candidateHash = crypto.scryptSync(password, salt, storedHash.length);
    return storedHash.length === candidateHash.length && crypto.timingSafeEqual(storedHash, candidateHash);
  } catch {
    return false;
  }
};
