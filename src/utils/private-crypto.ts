/**
 * 私密文章加解密（plan §8）——构建期（Node）与浏览器共用 WebCrypto。
 *
 * 盐策略（重要）：全站共用固定站点盐 PRIVATE_SALT，而不是每条 payload 随机盐。
 * 原因：派生密钥会被缓存复用（TTL 免重输），随机盐会导致不同页面的密钥不同、
 * 缓存失效。盐不是秘密（随页面公开），站点级唯一即可防彩虹表；
 * iv 仍每条随机（AES-GCM 硬性要求）。
 */

export const PBKDF2_ITERATIONS = 600_000;
export const IV_BYTES = 12;
export const KEY_LENGTH = 256;

/** 固定站点盐（16 字节）。想换就换，但改动会让已加密内容全部失效 */
export const PRIVATE_SALT = new Uint8Array([
  0x4d, 0x61, 0x6e, 0x67, 0x61, 0x50, 0x61, 0x70,
  0x65, 0x72, 0x2d, 0x70, 0x72, 0x69, 0x76, 0x31,
]); // "MangaPaper-priv1"

export interface EncryptedPayload {
  salt: string; // base64（固定站点盐的回显，仅作格式自描述；解密不使用它）
  iv: string; // base64，逐条随机
  data: string; // base64(AES-GCM ciphertext)
}

/** 私密文章密码：env PRIVATE_PASSWORD，缺省回落 "manga-paper"（仅本地/测试用，构建时警告） */
export function getPrivatePassword(id: string): string {
  const password = import.meta.env.PRIVATE_PASSWORD;
  if (password) return password;
  console.warn(
    `[private] 文章 "${id}" 正在使用默认密码 "manga-paper" 加密——上线前必须配置 PRIVATE_PASSWORD`,
  );
  return "manga-paper";
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

async function pbkdf2(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    material,
    { name: "AES-GCM", length: KEY_LENGTH },
    true, // extractable：浏览器端需要导出缓存到 localStorage
    ["encrypt", "decrypt"],
  );
}

/** 构建期：明文 HTML → 密文 payload（随机 iv；盐用固定站点盐） */
export async function encryptText(
  plaintext: string,
  password: string,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await pbkdf2(password, PRIVATE_SALT);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    textEncoder.encode(plaintext),
  );
  return {
    salt: toBase64(PRIVATE_SALT),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(cipher)),
  };
}

/** 浏览器端：密码 → 派生密钥（固定站点盐，可跨页面缓存） */
export async function deriveExportableKey(
  password: string,
): Promise<{ key: CryptoKey; exported: string }> {
  const key = await pbkdf2(password, PRIVATE_SALT);
  const raw = await crypto.subtle.exportKey("raw", key);
  return { key, exported: toBase64(new Uint8Array(raw)) };
}

/** 浏览器端：从 localStorage 恢复密钥 */
export async function importCachedKey(exported: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", fromBase64(exported) as BufferSource, "AES-GCM", false, [
    "decrypt",
  ]);
}

/** 解密；密码错误时 AES-GCM 校验失败抛异常（调用方 catch 即密码错误） */
export async function decryptText(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) as BufferSource },
    key,
    fromBase64(payload.data) as BufferSource,
  );
  return textDecoder.decode(plain);
}
