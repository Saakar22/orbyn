import "server-only";
import { argon2, randomBytes, timingSafeEqual } from "node:crypto";

// Argon2id with the OWASP-recommended minimum (19 MiB, 2 passes, 1 lane). Node 24.7+ ships it natively.
const MEMORY_KIB = 19_456;
const PASSES = 2;
const PARALLELISM = 1;
const TAG_LENGTH = 32;

function derive(password: string, nonce: Buffer, memory: number, passes: number, parallelism: number, tagLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    argon2(
      "argon2id",
      { message: Buffer.from(password.normalize("NFKC"), "utf8"), nonce, memory, passes, parallelism, tagLength },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/** Returns a PHC-format string: $argon2id$v=19$m=…,t=…,p=…$salt$hash */
export async function hashPassword(password: string) {
  const nonce = randomBytes(16);
  const key = await derive(password, nonce, MEMORY_KIB, PASSES, PARALLELISM, TAG_LENGTH);
  return `$argon2id$v=19$m=${MEMORY_KIB},t=${PASSES},p=${PARALLELISM}$${nonce.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  const match = stored?.match(/^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([\w-]+)\$([\w-]+)$/);
  if (!match) return false;
  const [, memory, passes, parallelism, salt, hash] = match;
  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"), Number(memory), Number(passes), Number(parallelism), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let decoy: Promise<string> | undefined;

/** Spend the same time as a real check when the account doesn't exist, so timing can't reveal which emails are registered. */
export async function verifyAgainstDecoy(password: string) {
  decoy ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await decoy);
  return false;
}
