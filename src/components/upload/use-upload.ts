import * as React from "react"
import type { FileRejection } from "react-dropzone"

import type {
  UploadFile,
  UploadRejection,
  UploadResponse,
  Uploader,
} from "./types"
import { defaultUploader } from "./api"
import { resolveUrl } from "@/lib/url"
import { toast } from "sonner"

/**
 * 三个上传组件共享的核心状态机。
 *
 * 关注点：
 * 1. 受控 / 非受控双模式，统一通过 emit 发出 onChange。
 * 2. 通过 AbortController 串联 uploader，文件被移除即取消请求。
 * 3. 暴露 addFiles / remove / retry / clear 等命令式 API，三个组件直接复用。
 * 4. 额外提供 useImagePreviewSrc 用于统一图片预览逻辑：优先用 response.url，
 *    否则对原始 File 即时 URL.createObjectURL，并在卸载/切换时 revoke。
 */

/** 生成一个轻量的内部 id，无需额外依赖 uuid。 */
function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 把字节数格式化为易读字符串，用于提示消息。 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${bytes}B`
}

/** 把 react-dropzone 的拒绝结构转成组件层统一的拒绝结构。 */
function normalizeRejections(rejections: FileRejection[]): UploadRejection[] {
  return rejections.flatMap((rejection) =>
    rejection.errors.map((error: { code: string; message: string }) => {
      const reason: UploadRejection["reason"] =
        error.code === "file-too-large"
          ? "file-too-large"
          : error.code === "file-invalid-type"
            ? "file-invalid-type"
            : error.code === "too-many-files"
              ? "too-many-files"
              : "unknown"
      return { file: rejection.file, reason, message: error.message }
    }),
  )
}

/** 从 accept 配置中提取可读的文件类型说明。 */
function describeAccept(accept?: Record<string, string[]>): string {
  if (!accept) return ""
  const extensions = Object.values(accept).flat().filter(Boolean)
  if (extensions.length > 0) return extensions.join("、")
  const mimeKeys = Object.keys(accept)
  if (mimeKeys.length > 0) return mimeKeys.join("、")
  return ""
}

export interface UseUploadValueAdapterReturn {
  /** 内部 UploadFile[]，只给 useUpload / FileList / 预览 UI 使用。 */
  files: UploadFile[]
  /** useUpload 的 onChange 适配器：把内部 UploadFile[] 转回业务侧 value。 */
  handleFilesChange: (files: UploadFile[]) => void
}

function hasResponseUrl(file: UploadFile): file is UploadFile & { response: UploadResponse & { url: string } } {
  return typeof file.response?.url === "string"
}

type UseUrlUploadValueAdapterOptions =
  | {
      /** 外部业务值：单图 URL。 */
      value?: string
      /** 单图模式，onChange 回传 string | undefined。 */
      multiple?: false
      /** 外部业务回调，只接收 URL 模型，不暴露 UploadFile[]。 */
      onChange?: (value: string | undefined) => void
    }
  | {
      /** 外部业务值：多图 URL 数组。 */
      value?: string[]
      /** 多图模式，onChange 回传 string[]。 */
      multiple: true
      /** 外部业务回调，只接收 URL 模型，不暴露 UploadFile[]。 */
      onChange?: (value: string[]) => void
    }

/**
 * ImageUpload 的模型适配层：外部 URL 字段 ↔ 内部 UploadFile[]。
 *
 * 为什么需要它：底层 useUpload / 预览网格必须依赖 UploadFile.id、status、progress
 * 来维护上传中间态；但图片业务表单只应该保存 URL 字符串。
 */
export function useUrlUploadValueAdapter(options: UseUrlUploadValueAdapterOptions): UseUploadValueAdapterReturn {
  const { value } = options
  const cacheRef = React.useRef<Map<string, UploadFile>>(new Map())

  const getOrCreate = React.useCallback((url: string): UploadFile => {
    const cached = cacheRef.current.get(url)
    if (cached) return cached
    // useUrlUploadValueAdapter 仅供 ImageUpload 使用，标记 contentType 以便
    // isImageLike 能正确识别无扩展名的图片 URL（如 Unsplash）。
    const file = createPreviewFile({ url, contentType: "image/*" })
    cacheRef.current.set(url, file)
    return file
  }, [])

  const pruneCache = React.useCallback((activeUrls: string[]) => {
    const activeSet = new Set(activeUrls)
    cacheRef.current.forEach((_: UploadFile, key: string) => {
      if (!activeSet.has(key)) cacheRef.current.delete(key)
    })
  }, [])

  const valueToFiles = React.useCallback(
    (input?: string | string[]): UploadFile[] => {
      if (!input) {
        pruneCache([])
        return []
      }
      const urls = (Array.isArray(input) ? input : [input]).filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
      pruneCache(urls)
      return urls.map(getOrCreate)
    },
    [getOrCreate, pruneCache],
  )

  const [files, setFiles] = React.useState<UploadFile[]>(() => valueToFiles(value))
  const filesRef = React.useRef(files)
  React.useEffect(() => {
    filesRef.current = files
  })

  React.useEffect(() => {
    const incoming = !value ? [] : (Array.isArray(value) ? value : [value]).filter(Boolean)
    const current = filesRef.current
      .filter(hasResponseUrl)
      .map((file: UploadFile & { response: UploadResponse & { url: string } }) => file.response.url)
    const same = incoming.length === current.length && incoming.every((url, index) => url === current[index])
    if (same) {
      pruneCache(incoming)
      return
    }
    if (filesRef.current.some((file: UploadFile) => file.status === "uploading")) return
    setFiles(valueToFiles(value))
  }, [pruneCache, value, valueToFiles])

  const handleFilesChange = React.useCallback(
    (nextFiles: UploadFile[]) => {
      setFiles(nextFiles)
      const urls = nextFiles
        .filter(hasResponseUrl)
        .map((file: UploadFile & { response: UploadResponse & { url: string } }) => file.response.url)
      pruneCache(urls)
      if (options.multiple === true) {
        options.onChange?.(urls)
        return
      }
      options.onChange?.(urls[0])
    },
    [options.multiple, options.onChange, pruneCache],
  )

  return { files, handleFilesChange }
}

interface UseResponseUploadValueAdapterOptions {
  /** 外部业务值：附件完整响应，Attachment 固定数组，Drag 单文件时可传单个对象。 */
  value?: UploadResponse | UploadResponse[]
  /** 非受控初始业务值，仅挂载时用于回显。 */
  defaultValue?: UploadResponse | UploadResponse[]
  /** 外部业务回调，只接收可持久化的 UploadResponse[]，不暴露 UploadFile[]。 */
  onChange?: (value: UploadResponse[]) => void
}

/**
 * AttachmentUpload / DragUpload 的模型适配层：外部 UploadResponse ↔ 内部 UploadFile[]。
 *
 * 为什么需要它：附件业务必须保存完整 UploadResponse（文件名、大小、类型等），
 * 但 UI 仍需要 UploadFile[] 来承载上传进度、失败重试、移除等运行时状态。
 */
export function useResponseUploadValueAdapter(options: UseResponseUploadValueAdapterOptions): UseUploadValueAdapterReturn {
  const { value, defaultValue, onChange } = options
  const cacheRef = React.useRef<Map<string, UploadFile>>(new Map())

  const getResponseKey = React.useCallback((response: UploadResponse, index: number) => {
    return `${response.url ?? ""}|${response.originalFileName ?? ""}|${response.fileName ?? ""}|${index}`
  }, [])

  const pruneCache = React.useCallback((activeKeys: string[]) => {
    const activeSet = new Set(activeKeys)
    cacheRef.current.forEach((_: UploadFile, key: string) => {
      if (!activeSet.has(key)) cacheRef.current.delete(key)
    })
  }, [])

  const inputToResponses = React.useCallback((input?: UploadResponse | UploadResponse[]): UploadResponse[] => {
    if (!input) return []
    return Array.isArray(input) ? input : [input]
  }, [])

  const responsesToKey = React.useCallback(
    (responses?: UploadResponse[]) => (responses ?? []).map(getResponseKey).join("\n"),
    [getResponseKey],
  )

  const valueToFiles = React.useCallback(
    (input?: UploadResponse | UploadResponse[]): UploadFile[] => {
      const responses = inputToResponses(input)
      const activeKeys = responses.map(getResponseKey)
      pruneCache(activeKeys)
      return responses.map((response: UploadResponse, index: number) => {
        const key = activeKeys[index]
        const cached = cacheRef.current.get(key)
        const preview = createPreviewFile(response)
        if (cached) return { ...cached, response: preview.response }
        cacheRef.current.set(key, preview)
        return preview
      })
    },
    [getResponseKey, inputToResponses, pruneCache],
  )

  const [files, setFiles] = React.useState<UploadFile[]>(() => valueToFiles(value ?? defaultValue))
  const filesRef = React.useRef(files)
  const lastEmittedKeyRef = React.useRef(responsesToKey(inputToResponses(value ?? defaultValue)))

  React.useEffect(() => {
    filesRef.current = files
  })

  React.useEffect(() => {
    if (value === undefined) return
    if (filesRef.current.some((file: UploadFile) => file.status === "uploading")) return
    const responses = inputToResponses(value)
    lastEmittedKeyRef.current = responsesToKey(responses)
    setFiles(valueToFiles(value))
  }, [inputToResponses, responsesToKey, value, valueToFiles])

  const handleFilesChange = React.useCallback(
    (nextFiles: UploadFile[]) => {
      setFiles(nextFiles)
      const responses = nextFiles
        .filter((file: UploadFile): file is UploadFile & { response: UploadResponse } => !!file.response)
        .map((file) => file.response)
      pruneCache(responses.map(getResponseKey))
      const nextKey = responsesToKey(responses)
      if (nextKey === lastEmittedKeyRef.current) return
      lastEmittedKeyRef.current = nextKey
      onChange?.(responses)
    },
    [getResponseKey, onChange, pruneCache, responsesToKey],
  )

  return { files, handleFilesChange }
}

export interface UseUploadOptions {
  /** 是否多文件模式。单文件模式下 addFiles 会用新文件覆盖旧文件。 */
  multiple: boolean
  /** 真正执行上传的函数。未提供时默认使用内置的 API 上传。 */
  uploader?: Uploader
  /** 内部受控文件列表。业务组件外层可自行做 UploadResponse/string 到 UploadFile[] 的适配。 */
  value?: UploadFile[]
  /** 内部非受控初始文件列表。 */
  defaultValue?: UploadFile[]
  /** 内部文件列表变化回调。 */
  onChange?: (files: UploadFile[]) => void
  /** 文件被拒绝回调。 */
  onReject?: (rejections: UploadRejection[]) => void
  /** 最大文件数量。 */
  maxCount?: number
  /** 单文件最大字节数，用于在 toast 中显示限制信息。 */
  maxSize?: number
  /** 接受的文件类型，用于在 toast 中显示支持的类型。 */
  accept?: Record<string, string[]>
}

export interface UseUploadReturn {
  files: UploadFile[]
  /** 接收浏览器 File 列表，自动转换、预览、并触发上传。 */
  addFiles: (files: File[]) => void
  /** 处理 react-dropzone 的 onDrop 回调（已含 accept/size 校验结果）。 */
  handleDrop: (accepted: File[], rejected: FileRejection[]) => void
  /** 移除指定文件（同时取消上传、释放预览 url）。 */
  remove: (id: string) => void
  /** 重试某个失败文件。 */
  retry: (id: string) => void
  /** 清空所有文件。 */
  clear: () => void
}

export function useUpload(options: UseUploadOptions): UseUploadReturn {
  const {
    multiple,
    uploader = defaultUploader,
    value,
    defaultValue,
    onChange,
    onReject,
    maxCount,
    maxSize,
    accept,
  } = options

  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState<UploadFile[]>(
    () => defaultValue ?? [],
  )
  const files = value !== undefined ? value : internal

  /**
   * 由于 onChange 中可能依赖最新的 files，但我们又需要在异步进度回调中读取
   * 最新值，因此用 ref 始终镜像最新数组，避免闭包过期。
   */
  const filesRef = React.useRef<UploadFile[]>(files)
  React.useEffect(() => {
    filesRef.current = files
  }, [files])

  /** 与每个 UploadFile.id 关联的 AbortController，用于取消请求。 */
  const controllersRef = React.useRef<Map<string, AbortController>>(new Map())

  /** 统一的 setter，自动处理受控 / 非受控并触发 onChange。 */
  const commit = React.useCallback(
    (next: UploadFile[]) => {
      filesRef.current = next
      if (!isControlled) setInternal(next)
      onChange?.(next)
    },
    [isControlled, onChange],
  )

  /** 局部更新某个文件并提交整份内部列表。 */
  const patchFile = React.useCallback(
    (id: string, patch: Partial<UploadFile>) => {
      const next = filesRef.current.map((item: UploadFile) =>
        item.id === id ? { ...item, ...patch } : item,
      )
      commit(next)
    },
    [commit],
  )

  const startUpload = React.useCallback(
    (target: UploadFile) => {
      if (!uploader) return
      // 没有原始 File（如 createPreviewFile 回显占位项）无法上传，直接跳过。
      if (!target.file) return
      const controller = new AbortController()
      controllersRef.current.set(target.id, controller)
      patchFile(target.id, { status: "uploading", progress: 0, error: undefined })

      uploader(target.file, {
        signal: controller.signal,
        onProgress: (percent) => {
          // 进度可能在请求被取消后回调，这里再校验一次。
          if (controller.signal.aborted) return
          patchFile(target.id, {
            progress: Math.max(0, Math.min(100, Math.round(percent))),
          })
        },
      })
        .then((response) => {
          if (controller.signal.aborted) return
          const responseWithOriginalName = {
            ...response,
            originalFileName: target.file?.name,
          }
          patchFile(target.id, {
            status: "success",
            progress: 100,
            response: responseWithOriginalName,
          })
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          console.error('[Upload] error', error)
          const message =
            error instanceof Error ? error.message : String(error ?? "上传失败")
          patchFile(target.id, { status: "error", error: message })
        })
        .finally(() => {
          controllersRef.current.delete(target.id)
        })
    },
    [patchFile, uploader],
  )

  const addFiles = React.useCallback(
    (incoming: File[]) => {
      if (incoming.length === 0) return

      const wrapped: UploadFile[] = incoming.map((file) => ({
        id: createId(),
        file,
        status: "uploading",
        progress: 0,
      }))

      let next: UploadFile[]
      if (!multiple) {
        // 单文件模式：替换旧文件并取消其上传请求。
        filesRef.current.forEach((old: UploadFile) => {
          controllersRef.current.get(old.id)?.abort()
        })
        next = wrapped.slice(0, 1)
      } else {
        next = [...filesRef.current, ...wrapped]
        if (typeof maxCount === "number" && next.length > maxCount) {
          // 超出 maxCount 的部分作为拒绝项反馈给业务方。
          const overflow = next.slice(maxCount)
          next = next.slice(0, maxCount)
          onReject?.(
            overflow
              .filter((item): item is UploadFile & { file: File } => !!item.file)
              .map((item) => ({
                file: item.file,
                reason: "too-many-files" as const,
                message: `最多仅支持 ${maxCount} 个文件`,
              })),
          )
        }
      }

      commit(next)
      // 上传需要拿到最新的引用，所以用 next 中的对应项触发。
      wrapped.forEach((item) => {
        const inList = next.find((f) => f.id === item.id)
        if (inList) startUpload(inList)
      })
    },
    [commit, maxCount, multiple, onReject, startUpload],
  )

  const handleDrop = React.useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const normalized = normalizeRejections(rejected)
        onReject?.(normalized)

        // 文件过大 toast 提示，包含限制大小
        const tooLargeFiles = normalized.filter((r) => r.reason === "file-too-large")
        if (tooLargeFiles.length > 0) {
          const sizeLimit = maxSize ? formatBytes(maxSize) : "5MB"
          const names = tooLargeFiles.map((r) => r.file.name).join("、")
          toast.error(`${names} 超出大小限制（最大 ${sizeLimit}）`)
        }

        // 文件类型不支持 toast 提示，包含支持的类型
        const invalidTypeFiles = normalized.filter((r) => r.reason === "file-invalid-type")
        if (invalidTypeFiles.length > 0) {
          const typeDesc = describeAccept(accept)
          const names = invalidTypeFiles.map((r) => r.file.name).join("、")
          const suffix = typeDesc ? `，仅支持 ${typeDesc}` : ""
          toast.error(`${names} 文件类型不支持${suffix}`)
        }
      }
      if (accepted.length > 0) addFiles(accepted)
    },
    [addFiles, onReject, maxSize, accept],
  )

  const remove = React.useCallback(
    (id: string) => {
      controllersRef.current.get(id)?.abort()
      controllersRef.current.delete(id)
      commit(filesRef.current.filter((item: UploadFile) => item.id !== id))
    },
    [commit],
  )

  const retry = React.useCallback(
    (id: string) => {
      const target = filesRef.current.find((item: UploadFile) => item.id === id)
      if (!target) return
      startUpload(target)
    },
    [startUpload],
  )

  const clear = React.useCallback(() => {
    filesRef.current.forEach((item: UploadFile) => {
      controllersRef.current.get(item.id)?.abort()
    })
    controllersRef.current.clear()
    commit([])
  }, [commit])

  /** 组件卸载时统一清理副作用。 */
  React.useEffect(() => {
    const controllers = controllersRef.current
    return () => {
      controllers.forEach((controller: AbortController) => controller.abort())
      controllers.clear()
    }
  }, [])

  return { files, addFiles, handleDrop, remove, retry, clear }
}

/** 从字符串（url 或文件名）中识别是否为图片后缀。 */
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)(?:$|\?)/i

/**
 * 更宽松的图片判定：优先看 File.type，其次 response.url / file.name 后缀。
 * 用来兼容 LLM 用 `new File([], '')` 构造的空壳占位 File（type 为空字符串）
 * 以及 BE 回显时只给 url、不给 type 的场景。
 */
export function isImageLike(file: UploadFile): boolean {
  if (file.file?.type?.startsWith("image/")) return true
  if (file.response?.contentType?.startsWith("image/")) return true
  const url = hasResponseUrl(file) ? file.response.url : ""
  const name = file.response?.originalFileName || file.response?.fileName || file.file?.name || ""
  return IMAGE_EXT_RE.test(url) || IMAGE_EXT_RE.test(name)
}

/**
 * 统一的图片预览 src 计算。
 *
 * 优先用 response.url（将相对路径通过 resolveUrl 拼接为当前域的绝对地址）；
 * 否则对原始 File 即时 createObjectURL，并在依赖变化 / 组件卸载时 revoke，避免内存泄露。
 *
 * 注：response.url 存储服务端返回的原始相对路径，此处按需拼接绝对地址
 * 以支持不同场景下前缀不一致的情况。
 */
export function useImagePreviewSrc(file: UploadFile): string | undefined {
  const isImage = isImageLike(file)
  const responseUrl = hasResponseUrl(file) ? file.response.url : undefined
  // 将相对路径拼接为绝对地址（若已是绝对地址则原样保留）
  const absoluteResponseUrl = resolveUrl(responseUrl, true)

  const [objectUrl, setObjectUrl] = React.useState<string | undefined>(undefined)
  React.useEffect(() => {
    if (!isImage || absoluteResponseUrl) {
      setObjectUrl(undefined)
      return
    }
    // 兜底：非 File 实例 / 空 File 直接跳过，避免 createObjectURL 产生破图 blob。
    if (!(file.file instanceof File)) {
      setObjectUrl(undefined)
      return
    }
    let url: string | undefined
    try {
      url = URL.createObjectURL(file.file)
    } catch (err) {
      console.warn("[Upload] createObjectURL failed", err)
      setObjectUrl(undefined)
      return
    }
    setObjectUrl(url)
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [file.file, isImage, absoluteResponseUrl])

  if (!isImage) return undefined
  return absoluteResponseUrl ?? objectUrl
}

/**
 * 由已有 URL 或服务端 UploadResponse 构造用于回显的内部 UploadFile。
 *
 * 入参可以是：
 * - 纯字符串：直接当作 url（主要给 ImageUpload 字符串模型使用）；
 * - `UploadResponse` 对象：至少包含 `url` 或 `fileName`，会完整放入 `response` 中，
 *   其中 `originalFileName` 会作为附件列表优先展示名称。
 *
 * 返回的 UploadFile 只填 `id` 与 `response`，不携带 `file` / `status` / `progress`，
 * 依赖 UploadFile 中这些字段都是可选的；组件预览时会优先用 response.url。
 *
 * 典型用法（组件内部适配时使用）：
 * ```tsx
 * createPreviewFile(formData.image_url)
 * createPreviewFile(uploadResponse)
 * ```
 */
export function createPreviewFile(
  input: string | UploadResponse,
): UploadFile {
  const raw: UploadResponse =
    typeof input === "string" ? { url: input } : input
  const url = raw.url || ""
  const fileName =
    (typeof raw.originalFileName === "string" ? raw.originalFileName : undefined) ||
    (typeof raw.fileName === "string" ? raw.fileName : undefined) ||
    url.split("/").pop()?.split("?")[0] ||
    "未命名文件"
  return {
    id: `preview-${url || fileName}-${Math.random().toString(36).slice(2, 8)}`,
    response: {
      ...(typeof input === "object" && input !== null ? input : {}),
      url,
      fileName,
    },
  }
}
