import * as React from "react"
import { useDropzone } from "react-dropzone"
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { UploadCommonProps, UploadFile } from "./types"
import { DEFAULT_IMAGE_ACCEPT } from "./types"
import { useImagePreviewSrc, useUpload, useUrlUploadValueAdapter } from "./use-upload"
/**
 * 与 ImageUpload 组件外观相关的 className 槽位。
 *
 * 暴露这些字段是为了让业务方在不 fork 组件的前提下，仍能调整尺寸 / 颜色 /
 * 圆角等关键视觉属性。AI 二次生成时，可以只覆盖个别 slot。
 */
export interface ImageUploadClassNames {
  /** 最外层容器。 */
  root?: string
  /** 空态（点击/拖拽以上传）的占位框。 */
  placeholder?: string
  /** 已选图片的预览框。 */
  preview?: string
  /** 预览图本身（<img>）。 */
  image?: string
  /** 进度遮罩层。 */
  overlay?: string
  /** 错误提示条。 */
  error?: string
}
type ImageUploadCommonProps = Pick<
  UploadCommonProps,
  "onUpload" | "accept" | "maxSize" | "maxCount" | "disabled" | "onReject" | "className"
> & {
  /**
   * 空态入口提示文案，可传 ReactNode 自定义图标 + 文案。
   * 单图默认: "点击或拖拽上传图片"；多图默认: "Upload"。
   */
  placeholder?: React.ReactNode
  /** 容器宽高比，默认 1（正方形）。 */
  aspectRatio?: number
  /** 各 slot 的样式覆盖。 */
  classNames?: ImageUploadClassNames
}

type ImageUploadSingleProps = ImageUploadCommonProps & {
  /** 是否多图模式。默认 false；不传或传 false 时，value/onChange 都是单图字符串模型。 */
  multiple?: false
  /** 单图 URL，直接对应表单里的 image_url / avatar_url 字段。 */
  value?: string
  /** 单图上传成功回传 URL；移除时回传 undefined。类型已收窄，不要额外做运行时防御。 */
  onChange?: (value: string | undefined) => void
}

type ImageUploadMultipleProps = ImageUploadCommonProps & {
  /** 是否多图模式。传 true 时，value/onChange 都切换为 string[] 数组模型。 */
  multiple: true
  /** 多图 URL 数组，直接对应表单里的 images 字段。 */
  value?: string[]
  /** 多图上传成功/移除后回传 URL 数组。 */
  onChange?: (value: string[]) => void
}

export type ImageUploadProps = ImageUploadSingleProps | ImageUploadMultipleProps

/**
 * 图片上传组件，统一采用 grid + tile 渲染：
 * - `multiple === false`（默认）：单图模式，已选后隐藏上传入口；点“移除”后重新按钮出现。
 * - `multiple === true`：多图模式，tile 罗列，末尾为“+ Upload”追加入口。
 *
 * **API 心智模型（与 AttachmentUpload / DragUpload 不同）**：
 * - `value` / `onChange` 均为 **字符串**（URL），单图是 `string`，多图是 `string[]`。
 * - 组件内部管理 `UploadFile[]` 进度状态，对外透明；上传成功后才触发 `onChange`。
 * - 如需保存完整文件对象（fileName / size / contentType），请改用 `AttachmentUpload` / `DragUpload`，它们会直接回传 `UploadResponse`。
 */
export function ImageUpload(props: ImageUploadProps) {
  const {
    onUpload,
    onReject,
    accept = DEFAULT_IMAGE_ACCEPT,
    maxSize = 5 * 1024 * 1024,
    maxCount: maxCountInput,
    disabled,
    className,
    multiple = false,
    placeholder,
    aspectRatio = 1,
    classNames,
  } = props
  // maxCount 负责限制多图数量，不再决定 value/onChange 类型。
  const normalizedMaxCount =
    typeof maxCountInput === "number" && Number.isFinite(maxCountInput)
      ? Math.max(1, Math.floor(maxCountInput))
      : undefined
  const maxCount = multiple ? normalizedMaxCount : 1
  const urlAdapterOptions: Parameters<typeof useUrlUploadValueAdapter>[0] = props.multiple === true
    ? { value: props.value, multiple: true, onChange: props.onChange }
    : { value: props.value, multiple: false, onChange: props.onChange }
  // 模型转换集中在 hook 中：外部 URL string/string[] ↔ 内部 UploadFile[]。
  const { files: internalFiles, handleFilesChange } = useUrlUploadValueAdapter(urlAdapterOptions)
  const { files, handleDrop, remove, retry } = useUpload({
    multiple,
    uploader: onUpload,
    value: internalFiles,
    onChange: handleFilesChange,
    onReject,
    maxCount,
    maxSize,
    accept,
  })
  const reached = typeof maxCount === "number" && files.length >= maxCount
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple,
    accept,
    maxSize,
    disabled: disabled || reached,
    onDrop: handleDrop,
  })
  return (
    <div className={cn("flex flex-col gap-2", className, classNames?.root)}>
      <div className="flex flex-wrap gap-3">
        {files.map((file) => (
          <div key={file.id} className="flex flex-col gap-1">
            <div
              style={{ aspectRatio }}
              className={cn(
                "group relative w-40 overflow-hidden rounded-md border bg-muted/30",
                file.status === "error" && "border-destructive",
                classNames?.preview,
              )}
            >
              <PreviewContent
                file={file}
                disabled={disabled}
                classNames={classNames}
                onRemove={() => remove(file.id)}
                onRetry={() => retry(file.id)}
              />
            </div>
            {file.status === "error" && (
              <p className={cn("w-40 text-xs text-destructive line-clamp-2", classNames?.error)}>
                {file.error ?? "上传失败"}
              </p>
            )}
          </div>
        ))}
        {!reached && (
          <div
            {...getRootProps()}
            style={{ aspectRatio }}
            className={cn(
              "flex w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/60",
              isDragActive && "border-primary bg-primary/5",
              disabled && "cursor-not-allowed opacity-60",
              classNames?.placeholder,
            )}
          >
            <input {...getInputProps()} />
            {placeholder && typeof placeholder !== "string" ? (
              placeholder
            ) : (
              <>
                <ImagePlus className="size-6" />
                <span className="text-xs">
                  {typeof placeholder === "string"
                    ? placeholder
                    : isDragActive
                      ? "释放以上传"
                      : multiple
                        ? "Upload"
                        : "点击或拖拽上传图片"}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
interface PreviewContentProps {
  file: UploadFile
  disabled?: boolean
  classNames?: ImageUploadClassNames
  onRemove: () => void
  onRetry: () => void
}
function PreviewContent(props: PreviewContentProps) {
  const { file, disabled, classNames, onRemove, onRetry } = props
  const src = useImagePreviewSrc(file)
  return (
    <>
      {src && (
        <img
          src={src}
          alt={file.file?.name || file.response?.originalFileName || file.response?.fileName || ""}
          className={cn("size-full object-cover", classNames?.image)}
        />
      )}
      {file.status === "uploading" && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 text-xs",
            classNames?.overlay,
          )}
        >
          <Loader2 className="size-5 animate-spin" />
          <Progress value={file.progress ?? 0} className="h-1 w-3/4" />
          <span>{file.progress ?? 0}%</span>
        </div>
      )}
      {file.status === "error" && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-destructive/10",
            classNames?.overlay,
          )}
        >
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation()
              onRetry()
            }}
            disabled={disabled}
          >
            <RefreshCw />
            重试
          </Button>
        </div>
      )}
      {/* 移除按钮：上传中也允许，因为会触发 abort。 */}
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute right-1 top-1 size-6 opacity-0 shadow transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        disabled={disabled}
        aria-label="移除"
      >
        <X />
      </Button>
    </>
  )
}
