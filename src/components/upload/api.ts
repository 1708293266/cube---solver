import { getAuthHeader } from "@/lib/auth"
import { resolveUrl } from "@/lib/url"
import type { UploadResponse } from "./types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeUploadResponse(data: unknown, file: File): UploadResponse | null {
  if (!isRecord(data)) return null
  const fileName = typeof data.fileName === "string" && data.fileName.length > 0 ? data.fileName : file.name
  return {
    ...data,
    fileName,
    url: typeof data.url === "string" ? data.url : undefined,
    originalFileName: file.name,
    size: typeof data.size === "number" ? data.size : undefined,
    contentType: typeof data.contentType === "string" ? data.contentType : undefined,
  }
}

function stringifyErrorMessage(error: unknown): string {
  if (typeof error === "string") return error
  if (isRecord(error)) {
    if (typeof error.message === "string") return error.message
    if (typeof error.error === "string") return error.error
  }
  return JSON.stringify(error) ?? String(error ?? "Upload failed")
}

// ============================================================
// Upload — API layer
// Centralised upload function so components don't need an
// uploader prop; they can call this directly.
// ============================================================

/**
 * Upload a single file to the server.
 * @param file - The browser File object to upload.
 * @param onProgress - Optional callback receiving 0-100 progress updates.
 * @param signal - Optional AbortSignal to cancel the upload.
 * @returns
 */
export function uploadFile(
  file: File,
  options: {
    onProgress?: (percent: number) => void
    signal?: AbortSignal
  } = {},
): Promise<UploadResponse> {
  const { onProgress, signal } = options

  const formData = new FormData()
  formData.append("file", file)

  const xhr = new XMLHttpRequest()

  const responsePromise = new Promise<UploadResponse>((resolve, reject) => {
    const url = resolveUrl(`/api/storage/upload`)
    xhr.open("POST", url)

    // Apply auth headers
    const authHeaders = getAuthHeader()
    for (const [key, value] of Object.entries(authHeaders)) {
      if (value == null) continue
      xhr.setRequestHeader(key, typeof value === "string" ? value : String(value))
    }

    // Progress tracking
    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          onProgress(percent)
        }
      })
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText)
          if (isRecord(json) && json.success && json.data) {
            const data = normalizeUploadResponse(json.data, file)
            if (!data) {
              reject(new Error("Upload failed: invalid response data"))
              return
            }
            // 服务端 fileName 可能是存储侧改写后的名称；保留浏览器原始文件名用于展示。
            data.originalFileName = file.name
            // 保持服务端返回的相对路径原样存入 data.url，
            // 绝对地址拼接统一在 useImagePreviewSrc 中按场景完成。
            resolve(data)
          } else {
            const error = isRecord(json) ? json.error || "Upload failed" : "Upload failed"
            reject(new Error(stringifyErrorMessage(error)))
          }
        } catch {
          reject(new Error("Upload failed: invalid JSON response"))
        }
      } else {
        const body = xhr.responseText?.trim()
        let bodyMsg = ""
        if (body) {
          try {
            const parsed = JSON.parse(body)
            bodyMsg = parsed?.error ?? parsed?.message ?? body
          } catch {
            bodyMsg = body
          }
        }
        const detail = bodyMsg ? ` — ${bodyMsg}` : ""
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText} ${detail}`))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Upload failed: network error")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))

    // Wire up AbortSignal
    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        reject(new Error("Upload aborted"))
        return
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true })
    }

    xhr.send(formData)
  })

  return responsePromise
}

/**
 * Convenience wrapper that adapts `uploadFile` to the `Uploader` signature
 * expected by the upload components (`use-upload.ts`).
 *
 * Usage:
 * ```tsx
 * import { defaultUploader } from "@/components/upload/api"
 * <ImageUpload onUpload={defaultUploader} />
 * ```
 */
export const defaultUploader = (
  file: File,
  ctx: { onProgress: (percent: number) => void; signal: AbortSignal },
): Promise<UploadResponse> => {
  return uploadFile(file, {
    onProgress: ctx.onProgress,
    signal: ctx.signal,
  })
}
