/**
 * 内容寻址的子集 blob 缓存：同一份「字重 + 面的种类 + 字符集」只切一次，
 * 构建之间也复用（`.cache/fonts/blobs/` 存文件，`faces.json` 存映射）。
 *
 * 为什么要缓存：切一份子集要读 20 MB 的完整 TTF，本机实测 ≈0.25 s/份。
 * 全站 80 多个面（core + 40×2 tail + 按页）里，加一篇文章只会改掉受影响的那几份，
 * 其余全部命中——干净 clone 第一次 ≈20 s，之后 ≈0.2 s。
 *
 * 键里带 `generator`（subset-font 版本）：升级它等于换了切法，旧 blob 不能复用。
 * 两个调用方（`scripts/build-fonts.ts` 与 `scripts/page-fonts.ts`）共用同一个缓存目录，
 * 所以「全站 core」与「按页子集」互不污染也互不覆盖。
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import subsetFont from "subset-font";

/** 文件名里的哈希长度（够区分，又不至于让文件名难读） */
export const BLOB_HASH_LENGTH = 8;

export interface FaceBlob {
  readonly file: string;
  readonly hash: string;
}

export interface BlobStore {
  /** 取（必要时现切）一份子集，返回 blob 文件名与其哈希 */
  ensure(label: string, kind: string, chars: string): Promise<FaceBlob>;
  /** 落盘索引；调用方在所有面都取完之后调一次 */
  flush(): void;
}

export interface BlobStoreOptions {
  readonly blobDir: string;
  readonly indexPath: string;
  /** 生成器版本（subset-font 的版本号） */
  readonly generator: string;
  /** 完整字体字节，按字重标签取 */
  readonly source: (label: string) => Buffer;
}

export function openBlobStore(options: BlobStoreOptions): BlobStore {
  const index = loadIndex(options.indexPath);
  return {
    async ensure(label, kind, chars) {
      const key = blobKey(options.generator, label, kind, chars);
      const cached = index[key];
      if (cached && existsSync(join(options.blobDir, cached))) {
        return { file: cached, hash: cached.slice(0, BLOB_HASH_LENGTH) };
      }
      const subset = await subsetFont(options.source(label), chars, { targetFormat: "woff2" });
      const file = `${sha256(subset).slice(0, BLOB_HASH_LENGTH)}.woff2`;
      mkdirSync(options.blobDir, { recursive: true });
      writeFileSync(join(options.blobDir, file), subset);
      index[key] = file;
      return { file, hash: file.slice(0, BLOB_HASH_LENGTH) };
    },
    flush() {
      mkdirSync(dirname(options.indexPath), { recursive: true });
      writeFileSync(options.indexPath, `${JSON.stringify(index, null, 2)}\n`);
    },
  };
}

function blobKey(generator: string, label: string, kind: string, chars: string): string {
  return sha256([generator, label, kind, chars].join("\u0000")).slice(0, 16);
}

function loadIndex(path: string): Record<string, string> {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}
