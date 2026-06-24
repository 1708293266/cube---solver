/**
 * URL 工具函数
 *
 * 统一处理两类路径问题：
 *   1. API 接口请求路径：拼接 Vite BASE_URL 前缀 → `resolveUrl(url)`
 *   2. 图片 / 资源预览路径：额外拼接 window.location.origin → `resolveUrl(url, true)`
 *
 * 两者底层共用同一实现，差异仅在于是否前置 origin。
 */

/**
 * 读取 Vite BASE_URL，末尾不带斜杠。
 * SSR / 测试环境下 import.meta 不可用时安全降级返回空字符串。
 */
function getBaseUrl(): string {
  try {
    const base = import.meta.env.BASE_URL ?? "/"
    return base.replace(/\/$/, "")
  } catch {
    // ignore
  }
  return ""
}

/**
 * 将相对路径解析为可访问的 URL。
 *
 * @param url      输入路径（相对或绝对）
 * @param absolute `false`（默认）— 仅拼接 BASE_URL 前缀，适用于 **API 接口请求**；
 *                 `true`           — 额外拼接 `window.location.origin`，适用于 **图片 / 资源预览**。
 *
 * 共同行为：
 * - 已是可直接使用的资源地址（`http(s):` / `//` / `data:` / `blob:` / `file:`）→ 原样返回
 * - `absolute=true` 且非浏览器环境（SSR）→ 降级为仅含 BASE_URL 的路径，不抛错
 *
 * 使用示例：
 * ```ts
 * resolveUrl("/api/upload")                    // → "/base/api/upload"（API 请求）
 * resolveUrl("/files/img.png", true)           // → "https://host/base/files/img.png"（预览）
 * resolveUrl("https://cdn.example.com/a.png")  // → "https://cdn.example.com/a.png"（远程资源）
 * resolveUrl("data:image/png;base64,...", true) // → 原样返回（内联资源）
 * resolveUrl("blob:https://host/uuid", true)    // → 原样返回（本地预览）
 * ```
 */
export function resolveUrl(url: string, absolute: boolean = false): string {
  if (!url) return url
  if (/^(https?:|data:|blob:|file:|\/\/)/i.test(url)) return url

  const base = getBaseUrl()
  const withBase =
    base && !url.startsWith(base)
      ? `${base}${url.startsWith("/") ? url : "/" + url}`
      : url

  if (!absolute) return withBase
  if (typeof window === "undefined") return withBase
  return `${window.location.origin}${withBase}`
}

/** `resolveUrl(url, true)` 的语义别名，用于图片预览（处理可选入参）。 */
export const toAbsoluteUrl = (url?: string): string | undefined =>
  url ? resolveUrl(url, true) : undefined
