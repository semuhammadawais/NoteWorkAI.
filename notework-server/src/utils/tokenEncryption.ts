import crypto from "crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const KEY = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex");

if (KEY.length !== 32) {
  throw new Error(
    "TOKEN_ENCRYPTION_KEY must be a 32-byte hex string. Run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  );
}

export function encryptToken(
  plaintext: string | null | undefined,
): string | null {
  if (!plaintext) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(
  encryptedString: string | null | undefined,
): string | null {
  if (!encryptedString) return null;

  const [ivHex, authTagHex, dataHex] = encryptedString.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted token string");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedData = Buffer.from(dataHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
