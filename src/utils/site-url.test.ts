import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadSiteEnv,
  siteUrlOrPlaceholder,
  assertDeployableSiteUrl,
  PLACEHOLDER_SITE_URL,
  PLACEHOLDER_HOST,
} from "./site-url.ts";

const REAL = "https://blog.example.com";
/** 测试专用的 key，避免和真实环境变量撞车 */
const KEY = "MANGAPAPER_TEST_SITE_URL";

/** 造一个只含指定 env 文件的临时目录 */
function withTempEnv(files: Record<string, string>, run: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "site-url-test-"));
  try {
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("loadSiteEnv：读得到 .env 里的变量", () => {
  delete process.env[KEY];
  withTempEnv({ ".env": `${KEY}=https://from-dotenv.example\n` }, (dir) => {
    loadSiteEnv(dir);
    assert.equal(process.env[KEY], "https://from-dotenv.example");
  });
  delete process.env[KEY];
});

test("loadSiteEnv：.env.local 覆盖 .env（与 Vite 的优先级一致）", () => {
  delete process.env[KEY];
  withTempEnv(
    {
      ".env": `${KEY}=https://from-env.example\n`,
      ".env.local": `${KEY}=https://from-local.example\n`,
    },
    (dir) => {
      loadSiteEnv(dir);
      assert.equal(process.env[KEY], "https://from-local.example");
    },
  );
  delete process.env[KEY];
});

test("loadSiteEnv：shell 里已存在的变量优先（临时覆盖照常生效）", () => {
  process.env[KEY] = "https://from-shell.example";
  withTempEnv({ ".env": `${KEY}=https://from-dotenv.example\n` }, (dir) => {
    loadSiteEnv(dir);
    assert.equal(process.env[KEY], "https://from-shell.example");
  });
  delete process.env[KEY];
});

test("loadSiteEnv：目录里没有 .env 也不抛错（部署平台只注入环境变量）", () => {
  withTempEnv({}, (dir) => {
    assert.doesNotThrow(() => loadSiteEnv(dir));
  });
});

test("siteUrlOrPlaceholder：有配置就用配置，原样返回", () => {
  assert.equal(siteUrlOrPlaceholder(REAL), REAL);
  assert.equal(siteUrlOrPlaceholder("http://localhost:4321"), "http://localhost:4321");
});

test("siteUrlOrPlaceholder：未配置 / 空 / 纯空白都退回占位域名（dev 不被挡）", () => {
  for (const value of [undefined, "", "   "]) {
    assert.equal(siteUrlOrPlaceholder(value), PLACEHOLDER_SITE_URL);
  }
  assert.equal(siteUrlOrPlaceholder(PLACEHOLDER_SITE_URL), PLACEHOLDER_SITE_URL);
});

test("siteUrlOrPlaceholder：非法 URL 任何情况下都报错（否则 canonical 静默坏掉）", () => {
  assert.throws(() => siteUrlOrPlaceholder("blog.example.com"), /不是合法的绝对 URL/);
  assert.throws(() => siteUrlOrPlaceholder("ftp://blog.example.com"), /只支持 http\/https/);
});

test("assertDeployableSiteUrl：未配置直接拒绝构建", () => {
  for (const value of [undefined, "", "   "]) {
    assert.throws(
      () => assertDeployableSiteUrl(value),
      /未配置 SITE_URL/,
      `value=${JSON.stringify(value)} 应该被拒绝`,
    );
  }
});

test("assertDeployableSiteUrl：示例占位域名直接拒绝构建", () => {
  assert.throws(() => assertDeployableSiteUrl(PLACEHOLDER_SITE_URL), /占位域名/);
});

test("assertDeployableSiteUrl：真实域名放行，前后空白裁掉", () => {
  assert.equal(assertDeployableSiteUrl(REAL), REAL);
  assert.equal(assertDeployableSiteUrl(`  ${REAL}  `), REAL);
  assert.equal(assertDeployableSiteUrl("http://localhost:4321"), "http://localhost:4321");
});

test("占位域名常量：裸域名形式可用（verify 的产物扫描依赖它）", () => {
  assert.equal(PLACEHOLDER_HOST, "your-domain.com");
  assert.ok(PLACEHOLDER_SITE_URL.includes(PLACEHOLDER_HOST));
});
