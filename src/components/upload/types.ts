/**
 * Upload 组件通用类型定义。
 *
 * ⚠️ 两套 API 模型，请按场景选择：
 * - `ImageUpload`：value/onChange 为 **字符串 URL**（单图 `string`，多图 `string[]`），
 *   直接对接图片 URL 字段。
 * - `AttachmentUpload` / `DragUpload`：value/onChange 为服务端返回的
 *   **`UploadResponse` / `UploadResponse[]`**，组件内部自动转换为 `UploadFile[]` 管理上传状态。
 *
 * `UploadFile` 是上传组件内部运行时状态对象，业务表单不要直接存它。
 */
/**
 * ImageUpload 的默认图片类型白名单。
 *
 * 与 DEFAULT_ATTACHMENT_ACCEPT 中的图片部分保持一致：
 * `.jpg .jpeg .png .gif .webp .svg .bmp`。
 * 业务方可通过 `accept` prop 覆盖，传入 `undefined` 表示不限类型。
 *
 * 格式遵循 react-dropzone 协议：{ "MIME类型": [".ext1", ".ext2"] }
 */
export const DEFAULT_IMAGE_ACCEPT: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
  "image/bmp": [".bmp"],
}
/**
 * AttachmentUpload / DragUpload 的默认文件类型白名单。
 *
 * 覆盖常见的图片、文档、电子表格、演示文稿、文本及压缩包格式。
 * `.jpg, .jpeg, .png, .gif, .webp, .svg, .bmp, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .csv, .zip`
 * 业务方可通过 `accept` prop 覆盖，传入 `undefined` 表示不限类型。
 *
 * 格式遵循 react-dropzone 协议：{ "MIME类型": [".ext1", ".ext2"] }
 */
export const DEFAULT_ATTACHMENT_ACCEPT: Record<string, string[]> = {
  // 图片
  ...DEFAULT_IMAGE_ACCEPT,
  // 文档
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  // 电子表格
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  // 演示文稿
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  // 文本 & 数据
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  // 压缩包
  "application/zip": [".zip"],
}
/** 单个文件在上传流水线中的状态。 */
export type UploadStatus = "idle" | "uploading" | "success" | "error"
/**
 * 上传文件的运行时数据结构。
 *
 * 同时承载本地 File 对象（用于重试）与上传成功后的 uploader 完整响应
 * 组件内部以 id 为主键管理列表，
 * 避免依赖 File 引用相等。
 */
export interface UploadFile {
  /** 内部唯一 id（非业务字段，组件自动生成）。 */
  id: string
  /** 浏览器原始 File 对象，重试与本地图片预览均依赖它。 */
  file?: File
  /** 当前上传状态。 */
  status?: UploadStatus
  /** 上传进度，0-100。仅 status === "uploading" 时持续更新。 */
  progress?: number
  /** 上传失败时的错误信息。 */
  error?: string
  /**
   * uploader 成功后返回的完整响应，原样透传给业务方。
   */
  response?: UploadResponse
}
/**
 * 上传过程回调上下文。
 *
 * - onProgress: uploader 在分片/xhr 进度变化时调用，传入 0-100 的整数。
 * - signal: 当用户移除文件或组件卸载时会触发 abort，uploader 应当尊重它。
 */
export interface UploaderContext {
  onProgress: (percent: number) => void
  signal: AbortSignal
}
/**
 * 业务方提供的真正执行上传的函数。
 *
 * 抛出错误（或 reject）会被组件捕获并标记为 error 状态。
 */
export type Uploader = (
  file: File,
  ctx: UploaderContext,
) => Promise<UploadResponse>
/**
 * 上传组件的公共 Props 基类。各业务组件按需扩展。
 */
export interface UploadCommonProps {
  /**
   * ⚠️ **默认不要传**。
   *
   * 不传时组件会自动走内置的 `defaultUploader`：`POST /api/storage/upload`，
   * 自带 **进度回调 / AbortSignal / 鉴权头 / 服务端相对路径拼 origin** 等能力。
   * 自己重写 `onUpload` 往往会丢失这些默认能力（典型如把 `fetch("/api/upload")` 直接包一层，
   * 既不响应 abort，也没有 progress、相对路径也不会拼 origin）。
   *
   * ✅ 推荐：直接不传
   *   ```tsx
   *   // ImageUpload — value/onChange 为字符串 URL
   *   <ImageUpload value={form.avatar_url} onChange={(url) => setForm(d => ({ ...d, avatar_url: url ?? '' }))} />
   *   // AttachmentUpload — value/onChange 为服务端 UploadResponse[]
   *   <AttachmentUpload value={form.attachments} onChange={(attachments) => setForm(d => ({ ...d, attachments }))} />
   *   ```
   *
   * ❌ 反例（默认能力会全部丢失）：
   *   ```tsx
   *   <AttachmentUpload
   *     onUpload={async (file) => {
   *       const fd = new FormData(); fd.append("file", file)
   *       const res = await fetch("/api/upload", { method: "POST", body: fd })
   *       return await res.json()
   *     }}
   *     value={form.attachments} onChange={(attachments) => setForm(d => ({ ...d, attachments }))}
   *   />
   *   ```
   *
   * 仅当业务确需走非默认协议（直传 OSS、特殊鉴权头、私有上传服务）时才自定义。
   * 即便要自定义，也务必尊重 `ctx.signal` 与 `ctx.onProgress`。
   */
  onUpload?: Uploader
  /**
   * 受控值，为服务端上传成功后返回的完整响应。
   *
   * - `AttachmentUpload`：固定传 `UploadResponse[]`
   * - `DragUpload`：`multiple={false}` 时传 `UploadResponse | undefined`，默认多文件时传 `UploadResponse[]`
   *
   * 组件内部会自动转换成 `UploadFile[]` 用于展示、进度、重试和移除；外部无需也不应该感知 `UploadFile`。
   */
  value?: UploadResponse | UploadResponse[]
  /**
   * 非受控初始值。仅在挂载时读取一次，之后 state 由组件内部管理。
   * 类型同 `value`，用于已有附件回显。
   */
  defaultValue?: UploadResponse | UploadResponse[]
  /**
   * 上传成功或文件移除后触发。
   *
   * - 单文件：回传 `UploadResponse | undefined`
   * - 多文件：回传 `UploadResponse[]`
   *
   * 回传值就是应保存到表单/数据库的完整服务端响应，不要再从内部状态里取 `response.url`。
   */
  onChange?: (value: UploadResponse | UploadResponse[] | undefined) => void
  /**
   * 接受的 MIME / 扩展名规则。
   * 形如：{ "image/*": [".png", ".jpg"] }，遵循 react-dropzone 协议。
   */
  accept?: Record<string, string[]>
  /** 单文件最大字节数。超过会触发 onReject。 */
  maxSize?: number
  /** 最大文件数量。多文件组件超过会触发 onReject。 */
  maxCount?: number
  /** 是否禁用整体交互。 */
  disabled?: boolean
  /** 文件被拒绝时触发（超大、类型不符、超数量等）。 */
  onReject?: (rejections: UploadRejection[]) => void
  /** 容器额外 className。 */
  className?: string
}
/** 文件被拒绝时的描述。 */
export interface UploadRejection {
  file: File
  reason: "file-too-large" | "file-invalid-type" | "too-many-files" | "unknown"
  message: string
}
/**
 * 上传接口返回的数据结构。
 *
 * 服务端 `POST /api/storage/upload` 成功时返回 `{ success: true, data: { url, fileName, size, contentType, ... } }`；
 * 组件会额外把浏览器原始文件名写入 `originalFileName`，用于展示。
 * 失败时返回 `{ success: false, error: string }`。
 *
 * `UploadResponse.url` 存储服务端返回的原始**相对路径**。
 * 绝对地址的拼接在 `useImagePreviewSrc` 中按具体场景完成，
 * 支持不同场景下应用前缀不一致的情况。
 */
export interface UploadResponse {
  /** 服务端返回的原始相对访问路径。预览时由 `useImagePreviewSrc` 按具体场景拼接为绝对地址。 */
  url?: string
  /** 服务端返回的原始文件名，可能是存储侧改写后的名称。 */
  fileName?: string
  /** 浏览器上传时的原始文件名，用于附件列表优先展示。 */
  originalFileName?: string
  /** 文件大小（字节）。 */
  size?: number
  /** 文件 MIME 类型。 */
  contentType?: string
  /** 允许服务端返回额外字段。 */
  [key: string]: unknown
}