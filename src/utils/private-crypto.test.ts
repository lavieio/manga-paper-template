import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encryptText,
  decryptText,
  deriveExportableKey,
  importCachedKey,
  PBKDF2_ITERATIONS,
  PRIVATE_SALT,
  IV_BYTES,
  KEY_LENGTH,
} from "../../src/utils/private-crypto.ts";

const PASSWORD = "test-password-123";

test("加密→解密 round-trip 恒等（含 CJK 与 HTML）", async () => {
  const html = "<h2 id='x'>私密章节 🔒</h2><p>机密内容</p>";
  const payload = await encryptText(html, PASSWORD);
  const { key } = await deriveExportableKey(PASSWORD);
  const plain = await decryptText(payload, key);
  assert.equal(plain, html);
});

test("同一密码派生的密钥可解开所有 payload（跨页面缓存的前提）", async () => {
  const payloadA = await encryptText("页面 A", PASSWORD);
  const payloadB = await encryptText("页面 B", PASSWORD);
  const { exported } = await deriveExportableKey(PASSWORD);
  const key = await importCachedKey(exported);
  assert.equal(await decryptText(payloadA, key), "页面 A");
  assert.equal(await decryptText(payloadB, key), "页面 B");
});

test("错误密码 → AES-GCM 校验失败抛异常", async () => {
  const payload = await encryptText("secret", PASSWORD);
  const { key } = await deriveExportableKey("wrong-password");
  await assert.rejects(decryptText(payload, key));
});

test("导出→导入缓存密钥可解密（localStorage 恢复路径）", async () => {
  const payload = await encryptText("cached", PASSWORD);
  const { exported } = await deriveExportableKey(PASSWORD);
  const restored = await importCachedKey(exported);
  assert.equal(await decryptText(payload, restored), "cached");
});

test("两次加密同明文：iv 随机（密文不同），盐固定（密钥可复用）", async () => {
  const a = await encryptText("same", PASSWORD);
  const b = await encryptText("same", PASSWORD);
  assert.notEqual(a.data, b.data, "iv 随机 → 密文必须不同");
  assert.notEqual(a.iv, b.iv, "iv 必须逐条随机");
  assert.equal(a.salt, b.salt, "盐必须固定，密钥才能跨页面缓存复用");
});

test("加密常量符合 plan §8 约定", () => {
  assert.equal(PBKDF2_ITERATIONS, 600_000);
  assert.equal(PRIVATE_SALT.length, 16);
  assert.equal(IV_BYTES, 12);
  assert.equal(KEY_LENGTH, 256);
});
