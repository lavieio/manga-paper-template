---
title: 内部工具的一段代码
description: 给自己用的脚本，顺手记一下思路。
tags: [工具]
private: true
date: 2026-09-16
---

## 背景

有个小脚本只在自己机器上跑，不值得开源，但值得记一笔。

## 实现

```ts
const PASSWORD = "not-in-this-file-anywhere";

export function seal(content: string): string {
  // 只写思路，真实实现更啰嗦
  return `sealed:${content.length}`;
}
```

## 踩过的坑

1. 一开始把密码写死在脚本里——后来才搬进环境变量
2. 忘记处理空内容
3. 时间戳用了本地时区，跨机器就不一致了

以上就是全部。
