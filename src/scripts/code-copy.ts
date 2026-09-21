/**
 * 代码块「复制」按钮（plan §7.4）
 * - 事件委托：公开文章的按钮由构建期注入（rehype-code-copy），私密文章解密后注入的内容同样是
 *   .code-copy，所以这里不需要任何初始化、也不怕解密后重建。
 * - 复制纯文本：优先 Clipboard API（HTTPS / localhost），失败退到 execCommand 兜底；
 *   两者都失败就**就地显示「复制失败」**（不静默），并把原因打到控制台。
 * - 复制内容取 <pre>.textContent 并去掉尾部空白：Shiki 每个 line 后面带换行，
 *   不去掉的话粘贴处会多一个空行；按钮自己不是 pre 的后代，所以不会混进按钮文字。
 */

const DONE_TEXT = "已复制";
const FAIL_TEXT = "复制失败";
/** 成功提示停留时长；失败留久一点，别让用户错过 */
const DONE_MS = 1600;
const FAIL_MS = 2600;

interface CopyResult {
  ok: boolean;
  via?: "clipboard" | "execCommand";
  reason?: string;
}

/** 正文里的代码块（含私密文章解密后的） */
function codeText(btn: HTMLButtonElement): string | null {
  const pre = btn.closest(".code-wrap")?.querySelector("pre");
  return pre ? pre.textContent.replace(/\s+$/, "") : null;
}

async function copyText(text: string): Promise<CopyResult> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, via: "clipboard" };
    } catch (err) {
      // 落到 execCommand 兜底，原因留给控制台
      console.warn("[code-copy] Clipboard API 失败，改用 execCommand：", err);
    }
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok ? { ok: true, via: "execCommand" } : { ok: false, reason: "execCommand 返回 false" };
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
}

function feedback(btn: HTMLButtonElement, result: CopyResult): void {
  const text = result.ok ? DONE_TEXT : FAIL_TEXT;
  btn.textContent = text;
  btn.setAttribute("aria-label", result.ok ? "已复制到剪贴板" : "复制失败，请手动选择复制");
  btn.classList.toggle("is-done", result.ok);
  btn.classList.toggle("is-fail", !result.ok);
  if (!result.ok) console.warn("[code-copy] 复制失败：", result.reason);

  window.clearTimeout(Number(btn.dataset.resetTimer));
  const timer = window.setTimeout(() => {
    btn.textContent = "复制";
    btn.setAttribute("aria-label", "复制代码");
    btn.classList.remove("is-done", "is-fail");
  }, result.ok ? DONE_MS : FAIL_MS);
  btn.dataset.resetTimer = String(timer);
}

export function initCodeCopy(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const btn = target?.closest<HTMLButtonElement>(".code-copy");
    if (!btn) return;
    const text = codeText(btn);
    if (text === null) return;
    void copyText(text).then((result) => feedback(btn, result));
  });
}
