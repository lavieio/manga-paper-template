/**
 * 面 → 发布目录里的产物文件：core / tail / 按页子集 共用这一步——
 * 切一份子集（走 blob 缓存）、按内容哈希命名、拷进发布目录、量出字节数。
 *
 * 两个调用点只差发布目录：`scripts/build-fonts.ts` 写 `public/fonts/`（astro 会把整目录
 * 拷进 `dist/`），`scripts/page-fonts.ts` 写 `dist/fonts/`（构建后直接落在产物里）。
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { faceFileName } from "./font-charsets.ts";
import type { BlobStore } from "./font-blobs.ts";
import type { FacePlan } from "./font-plan.ts";
import type { FaceFile } from "./font-render.ts";

/** 已经落进发布目录的面：文件名给 `@font-face` 用，字节数给构建日志与预算断言用 */
export interface WrittenFace extends FaceFile {
  readonly bytes: number;
}

/** 切一份面（命中 blob 缓存就复用）、拷进发布目录 */
export async function writeFace(face: FacePlan, store: BlobStore, outDir: string): Promise<WrittenFace> {
  const blob = await store.ensure(face.label, face.kind, face.chars);
  const name = faceFileName(face.label, face.kind, blob.hash);
  mkdirSync(outDir, { recursive: true });
  copyFileSync(blob.path, join(outDir, name));
  return { face, name, bytes: statSync(join(outDir, name)).size };
}

/** 一批面依次落盘（顺序与入参一致，`renderFaceCss` 依赖它） */
export async function writeFaces(faces: readonly FacePlan[], store: BlobStore, outDir: string): Promise<WrittenFace[]> {
  const written: WrittenFace[] = [];
  for (const face of faces) written.push(await writeFace(face, store, outDir));
  return written;
}
