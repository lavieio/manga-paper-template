/** 私密解锁密钥的本地缓存：localStorage + 时效控制（短期有效，过期自动清除） */

const KEY = "mangapaper:private-key";
/** 时效从 env PUBLIC_UNLOCK_TTL_HOURS 读取，默认 1 小时 */
export const UNLOCK_TTL_HOURS = Number(import.meta.env.PUBLIC_UNLOCK_TTL_HOURS) || 1;

interface CachedKey {
  exported: string; // base64(raw key)
  expires: number; // epoch ms
}

export function saveUnlockedKey(exported: string): void {
  const entry: CachedKey = {
    exported,
    expires: Date.now() + UNLOCK_TTL_HOURS * 3600_000,
  };
  localStorage.setItem(KEY, JSON.stringify(entry));
}

/** 过期或不存在返回 null */
export function loadUnlockedKey(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedKey;
    if (Date.now() > entry.expires) {
      localStorage.removeItem(KEY);
      return null;
    }
    return entry.exported;
  } catch {
    return null;
  }
}

/** 缓存失效（如密码已更换）时清除，避免反复尝试 */
export function clearUnlockedKey(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 忽略存储不可用 */
  }
}
