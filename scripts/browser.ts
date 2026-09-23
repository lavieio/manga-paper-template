/**
 * 浏览器冒烟测试的最小工具（零依赖，Node 22+）。
 *
 * - startStaticServer：用 node:http 直接服务 dist/。**不复用 `astro preview`**——它带单实例锁，
 *   本地或 CI 里容易把别的预览顶掉、或自己被顶掉后静默失败。
 * - launchBrowser：起 headless Chrome，用 Node 内置的 WebSocket 直连 CDP。
 *   不引入 puppeteer / chrome-launcher：仓库依赖白名单里没有它们，装不上才是常态。
 *
 * @see scripts/smoke-dist.ts
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server, type ServerResponse } from "node:http";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { tmpdir } from "node:os";

const READY_TIMEOUT_MS = 15_000;
const POLL_MS = 100;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
};

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export type Sender = <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;

export interface StaticServer {
  url: string;
  close(): Promise<void>;
}

export interface Browser {
  /** dist 的静态服务地址 */
  base: string;
  send: Sender;
  close(): Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 轮询等条件成立：Chrome 冷启动没有事件可等，只能盯它的就绪信号 */
async function waitFor<T>(probe: () => T | null | Promise<T | null>, what: string): Promise<T> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value !== null) return value;
    await sleep(POLL_MS);
  }
  throw new Error(`[smoke] ${what} 未在 ${READY_TIMEOUT_MS}ms 内就绪`);
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** URL 路径 → dist 内的真实文件：目录取 index.html，/foo 也接受 foo.html，越界返回 null */
function resolveFile(root: string, urlPath: string): string | null {
  const full = join(root, decodeURIComponent(urlPath).replace(/^\/+/, ""));
  if (relative(root, full).startsWith("..")) return null;
  if (isFile(full)) return full;
  if (isFile(join(full, "index.html"))) return join(full, "index.html");
  if (isFile(`${full}.html`)) return `${full}.html`;
  return null;
}

function respond(res: ServerResponse, root: string, file: string | null): void {
  if (!file) {
    const page = join(root, "404.html");
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(isFile(page) ? readFileSync(page) : "404");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}

/** 起一个只服务 dist/ 的静态服务（端口由系统分配） */
export async function startStaticServer(root: string): Promise<StaticServer> {
  const server: Server = createServer((req, res) => {
    const path = (req.url ?? "/").split(/[?#]/)[0];
    respond(res, root, resolveFile(root, path));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** Chrome 可执行文件：CHROME_PATH 优先，其次常见安装路径；都找不到返回 null（调用方走 SKIP） */
export function resolveChromePath(): string | null {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    process.env.CHROME_PATH,
    ...CHROME_CANDIDATES,
    localAppData ? join(localAppData, "Google/Chrome/Application/chrome.exe") : undefined,
  ];
  return candidates.find((path) => !!path && isFile(path)) ?? null;
}

function spawnChrome(chromePath: string, userDataDir: string): ChildProcess {
  return spawn(
    chromePath,
    [
      "--headless=new",
      "--no-first-run",
      "--no-sandbox",
      "--disable-gpu",
      // 端口交给 Chrome 选，真实端口写在 user-data-dir/DevToolsActivePort
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      // 本机常挂 HTTP 代理：localhost 必须绕过，否则静态服务全 502
      "--proxy-bypass-list=localhost;127.0.0.1",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
}

async function readDevToolsPort(userDataDir: string, proc: ChildProcess): Promise<number> {
  const file = join(userDataDir, "DevToolsActivePort");
  const content = await waitFor(() => {
    if (proc.exitCode !== null) throw new Error(`[smoke] Chrome 提前退出（code ${proc.exitCode}）`);
    return isFile(file) ? readFileSync(file, "utf8") : null;
  }, "Chrome 调试端口");
  return Number(content.split("\n")[0]);
}

async function openPageSocket(port: number): Promise<WebSocket> {
  const wsUrl = await waitFor(async () => {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`).catch(() => null);
    if (!res?.ok) return null;
    const targets = (await res.json()) as Array<{ type?: string; webSocketDebuggerUrl?: string }>;
    return targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl)?.webSocketDebuggerUrl ?? null;
  }, "CDP page target");

  const socket = new WebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve());
    socket.addEventListener("error", () => reject(new Error(`[smoke] CDP 连接失败：${wsUrl}`)));
  });
  return socket;
}

/** 把 CDP 的 request/response 协议包成 await-able 的 send()（事件通知直接忽略） */
function createSender(socket: WebSocket): Sender {
  const pending = new Map<number, (value: unknown) => void>();
  let id = 0;
  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: unknown };
    if (msg.id === undefined) return;
    pending.get(msg.id)?.(msg.error ?? msg.result);
    pending.delete(msg.id);
  });
  return <T>(method: string, params: Record<string, unknown> = {}) =>
    new Promise<T>((resolve) => {
      const messageId = ++id;
      pending.set(messageId, resolve as (value: unknown) => void);
      socket.send(JSON.stringify({ id: messageId, method, params }));
    });
}

interface TeardownContext {
  socket: WebSocket;
  proc: ChildProcess;
  server: StaticServer;
  userDataDir: string;
}

async function teardown(ctx: TeardownContext): Promise<void> {
  ctx.socket.close();
  ctx.proc.kill();
  await ctx.server.close();
  rmSync(ctx.userDataDir, { recursive: true, force: true });
}

/** 起静态服务 + headless Chrome，返回可用于 send() 的会话 */
export async function launchBrowser(chromePath: string, root: string): Promise<Browser> {
  const userDataDir = await mkdtemp(join(tmpdir(), "mangapaper-smoke-"));
  const server = await startStaticServer(root);
  const proc = spawnChrome(chromePath, userDataDir);
  try {
    const socket = await openPageSocket(await readDevToolsPort(userDataDir, proc));
    return {
      base: server.url,
      send: createSender(socket),
      close: () => teardown({ socket, proc, server, userDataDir }),
    };
  } catch (err) {
    proc.kill();
    await server.close();
    rmSync(userDataDir, { recursive: true, force: true });
    throw err;
  }
}
