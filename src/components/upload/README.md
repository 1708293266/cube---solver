# Upload 组件

基于 [`react-dropzone`](https://react-dropzone.js.org/) + shadcn UI 的轻量上传组件。**请直接使用本目录下的现成组件，不要自己写 `<input type="file">` + `fetch("/api/upload")`** —— 那样会丢掉进度、abort、受控双模式、错误重试、toast 等内置能力。如需扩展请通过 Props / `useUpload` hook 组合。

| 组件               | 形态                                                  | 典型场景                       |
| ------------------ | ----------------------------------------------------- | ------------------------------ |
| `ImageUpload`      | 图片缩略图 grid + tile（单/多图由 `multiple` 控制）   | 头像、封面图、九宫格画廊、image_url       |
| `AttachmentUpload` | 按钮 + 文件列表                                       | 表单内"附件"字段               |
| `DragUpload`       | 大面积拖拽区 + 列表                                   | 批量导入、独立上传页           |

---

## 🚨 必读：两套 API 模型（图片 vs 附件）

**`ImageUpload` 和 `AttachmentUpload` / `DragUpload` 的 API 是不同的**，请根据场景选择：

### ImageUpload — 字符串 URL 模型（推荐图片场景）

| Prop       | 类型                                | 说明                                              |
| ---------- | ----------------------------------- | ------------------------------------------------- |
| `value`    | `string`（单图）/ `string[]`（多图）| **是 URL 字符串**，直接对应表单的 `image_url` 字段 |
| `multiple` | `boolean`，默认 `false` | **是否多图模式**；传 `true` 后 `value/onChange` 才使用 `string[]` |
| `onChange` | 单图：`(v: string \| undefined) => void`；多图：`(v: string[]) => void` | 上传成功/移除后触发，直接写回表单字段 |

> 图片通常只需要保存 URL，无需关心 `fileName`、`size` 等文件元信息。组件内部自动管理 `UploadFile[]` 进度状态，对外完全透明。

```tsx
// ✅ 单图 — 直接对接表单字符串字段
<ImageUpload
  value={form.avatar_url}
  onChange={(url) => setForm((d) => ({ ...d, avatar_url: url ?? "" }))}
/>

// ✅ 多图 — 对接表单字符串数组
<ImageUpload
  multiple
  maxCount={9}
  value={form.images}
  onChange={(urls) => setForm((d) => ({ ...d, images: urls }))}
/>
```

### AttachmentUpload / DragUpload — UploadResponse 对象模型（附件场景）

| Prop       | 类型                                                                 | 说明                                                                       |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `value`    | `UploadResponse[]`（附件/多文件）/ `UploadResponse`（单文件 Drag）    | **是服务端返回对象**，可直接对应表单附件字段；组件内部自动转为 `UploadFile[]` |
| `onChange` | `(v: UploadResponse[] \| UploadResponse \| undefined) => void`       | 上传成功/移除后触发，回传可直接保存的完整 `UploadResponse`                  |

> ⚠️ **附件不能只保存 URL**。合同、文档等附件场景通常需要保存完整的 `UploadResponse`（含 `fileName`、`originalFileName`、`size`、`contentType`），否则展示时无法显示原始文件名和图标。组件内部会自动管理 `UploadFile[]` 进度状态，对外完全透明。

```tsx
// ✅ 标准模板：附件字段保存完整 UploadResponse 对象数组
import { AttachmentUpload } from "@/components/upload"

<AttachmentUpload
  value={formData.attachments}
  onChange={(attachments) => setFormData((d) => ({ ...d, attachments }))}
  maxCount={5}
/>
```

---

## 通用 Props

| 字段           | 类型                                      | 说明                                                                                  |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `onUpload` ⚠️  | `Uploader`                                | **默认不要传**。未传时自动走 `defaultUploader`（`POST /api/storage/upload`，含进度/abort/鉴权）；仅在需要走非默认上传协议（如直传 OSS、特殊鉴权头）时才自定义 |
| `accept`       | `Record<string, string[]>`                | 接受的 MIME / 扩展名，遵循 `react-dropzone` 协议。`ImageUpload` 未传时默认 `DEFAULT_IMAGE_ACCEPT`（`.jpg .jpeg .png .gif .webp .svg .bmp`）；`AttachmentUpload` / `DragUpload` 未传时默认 `DEFAULT_ATTACHMENT_ACCEPT`（图片/文档/表格/演示文稿/文本/压缩包） |
| `maxSize`      | `number`                                  | 单文件最大字节数，默认 `5 * 1024 * 1024`（5MB），超出自动 toast                       |
| `maxCount`     | `number`                                  | 最大文件数。`ImageUpload` 中多图时作为数量上限，单图固定最多 1 个；图片单/多图由 `multiple` 显式控制 |
| `disabled`     | `boolean`                                 | 整体禁用                                                                              |
| `onReject`     | `(rejections: UploadRejection[]) => void` | 文件被拒绝（超大/类型不符/超数量）                                                    |
| `className`    | `string`                                  | 容器额外 className                                                                    |

### 类型定义

```ts
interface UploadFile {
  id: string                    // 内部唯一 id
  file?: File                   // 原始 File（上传中才有）
  status?: "idle" | "uploading" | "success" | "error"
  progress?: number             // 0-100
  error?: string
  response?: UploadResponse     // uploader 成功后返回的完整响应
}

interface UploadResponse {
  url?: string           // 服务端相对路径；展示时需用 resolveUrl(url, true) 拼绝对地址
  fileName: string          // 服务端文件名，可能被存储侧改写
  originalFileName?: string // 浏览器上传时的原始文件名，附件展示优先使用它
  size?: number
  contentType?: string
  [key: string]: unknown // 允许服务端返回额外字段
}
```

> 自定义 `onUpload` 实现请参考 [`use-upload.ts`](./use-upload.ts) 中的 `defaultUploader`：监听 `signal.aborted` 取消请求、调 `onProgress(percent)` 上报进度、最终 `resolve` 一个含 `url` 的对象。

### 在上传组件外单独预览图片

表单提交后，`response.url` / `formData.image_url` 存储的是**服务端返回的相对路径**。
若要在上传组件以外（如详情页、弹窗预览、独立图片展示）展示图片，必须处理相对路径，允许两种安全写法：优先使用 `Img` 组件；如果确实需要写原生图片标签，`src` 必须使用 `resolveUrl(url, true)` 或 `toAbsoluteUrl(url)` 包裹。

```tsx
import { Img } from "@/components/img"
import { resolveUrl, toAbsoluteUrl } from "@/lib/url"

// ✅ 单图预览（推荐）
<Img src={formData.image_url} alt="预览" />

// ✅ 允许：原生图片标签必须包裹 URL
<img src={resolveUrl(formData.image_url, true)} alt="预览" />
<img src={toAbsoluteUrl(formData.image_url)} alt="预览" />

// ✅ 多图预览优先用 Img
{(formData.images ?? []).map((url) => (
  <Img key={url} src={url} alt="预览" />
))}
```

禁止把 `formData.image_url`、`response.url` 或数组里的原始 `url` 直接传给原生图片标签的 `src`，否则跨场景 / 不同 BASE_URL 时可能 404；原生图片标签只允许使用 `resolveUrl` / `toAbsoluteUrl` 处理后的地址。

> `Img` 内部会通过 `resolveUrl(url, true)` / `toAbsoluteUrl(url)` 自动判断：若已是可直接使用的资源地址（`http(s):` / `//` / `data:` / `blob:` / `file:`）则原样返回；若是相对路径则拼接 `window.location.origin + BASE_URL 前缀`，适配不同部署场景下路径前缀不一致的情况。

---

## ImageUpload

```tsx
import { ImageUpload } from "@/components/upload"

// 单图（默认）
<ImageUpload
  value={form.avatar_url}
  onChange={(url) => setForm((d) => ({ ...d, avatar_url: url ?? "" }))}
  aspectRatio={1}
/>

// 多图
<ImageUpload
  multiple
  maxCount={9}
  value={form.images}
  onChange={(urls) => setForm((d) => ({ ...d, images: urls }))}
  aspectRatio={16 / 9}
/>
```

专属 Props：
- `value`：`string`（单图）或 `string[]`（多图）
- `onChange`：单图 `(v: string | undefined) => void`，移除时收到 `undefined`；多图 `(v: string[]) => void`，移除后收到更短的 `string[]`。类型已经收窄，不要额外做运行时类型判断
- `multiple`：默认 `false`（单图）。传 `true` 切换为多图九宫格，同时把 `value/onChange` 类型收窄为 `string[]`
- `maxCount`：多图模式下的最大图片数量；单图模式固定最多 1 个。只限制数量，不再决定单/多图模式；输入会被规范化：非有限数 / 负数 / `0` → `1`，小数取整
- `placeholder`：空态文案，默认 `"点击或拖拽上传图片"`（多图模式为 `"Upload"`）
- `aspectRatio`：默认 `1`（正方形），可设为 `16/9` 等
- `classNames`：`{ root, placeholder, preview, image, overlay, error }`

特性：本地预览即时显示；上传中半透明遮罩 + 进度条 + 百分比；失败 tile 高亮 + 重试按钮；hover 出"移除"按钮；单图模式选中后入口隐藏，多图模式末尾固定 `+ Upload` dropzone。

---

## AttachmentUpload

```tsx
import { AttachmentUpload } from "@/components/upload"

<AttachmentUpload
  triggerText="上传附件"
  hint="支持 pdf/docx/zip，单文件 ≤ 5MB，最多 5 个"
  accept={{ "application/pdf": [".pdf"], "application/zip": [".zip"] }}
  maxSize={5 * 1024 * 1024}
  maxCount={5}
  value={formData.attachments}
  onChange={(attachments) => setFormData((d) => ({ ...d, attachments }))}
/>
```

专属 Props：`triggerText` / `triggerVariant` / `triggerSize` / `hint` / `showThumbnail`（默认 `true`） / `classNames: { root, trigger, list, item }`。

**⚠️ 附件字段持久化规范**：`value` 传入 `UploadResponse[]`，`onChange` 也回传 `UploadResponse[]`。组件内部自动转换为 `UploadFile[]` 展示进度和状态，附件列表展示名称优先级为 `file.name` → `response.originalFileName` → `response.fileName`。业务表单不要保存内部 `UploadFile`，也不要只保存 `response.url`。

```tsx
// ✅ 正确：保存完整 UploadResponse[]
<AttachmentUpload
  value={formData.attachments}
  onChange={(attachments) => setFormData(d => ({ ...d, attachments }))}
/>

// ❌ 错误：只保存 URL，丢失 fileName / size / contentType
<AttachmentUpload onChange={(attachments) => setUrls(attachments.map(item => item.url))} />
```

特性：按钮选择 + 拖入区域双通道；达 `maxCount` 自动禁用按钮；列表行展示缩略图 / 文件名 / 大小或进度 / 状态 / 重试-移除。

---

## DragUpload

```tsx
import { DragUpload, type UploadResponse } from "@/components/upload"

<DragUpload
  multiple
  maxCount={10}
  accept={{ "image/*": [], "application/pdf": [".pdf"] }}
  value={formData.files}
  onChange={(files) => setFormData((d) => ({ ...d, files: files as UploadResponse[] }))}
/>

<DragUpload
  multiple={false}
  title="拖入 CSV 文件以导入"
  description="表头需匹配模板"
  value={formData.csvFile}
  onChange={(file) => setFormData((d) => ({ ...d, csvFile: file as UploadResponse | undefined }))}
/>
```

专属 Props：`multiple`（默认 `true`，`false` 时新文件替换旧文件） / `title` / `description`（`null` 隐藏，未传则按 accept/maxSize/maxCount 自动生成）/ `icon` / `showThumbnail` / `classNames: { root, dropzone, icon, title, description, list, item }`。

**⚠️ 同 AttachmentUpload，`value` / `onChange` 直接使用完整 `UploadResponse` 或 `UploadResponse[]`，不要只保存 URL。**

特性：拖入合法变蓝、`isDragReject` 变红。

---

## 复用底层 hook

默认形态不满足时直接组合 `useUpload`。如果你仍希望沿用组件内置的数据模型转换，可搭配两个适配 hook：

- `useUrlUploadValueAdapter`：外部 URL `string/string[]` ↔ 内部 `UploadFile[]`，用于图片模型。
- `useResponseUploadValueAdapter`：外部 `UploadResponse/UploadResponse[]` ↔ 内部 `UploadFile[]`，用于附件/拖拽模型。

```tsx
import { useUpload, useResponseUploadValueAdapter, FileList } from "@/components/upload"

const { files: internalFiles, handleFilesChange } = useResponseUploadValueAdapter({
  value: formData.attachments,
  onChange: (attachments) => setFormData((d) => ({ ...d, attachments })),
})

const { files, addFiles, handleDrop, remove, retry, clear } = useUpload({
  multiple: true,
  value: internalFiles,
  onChange: handleFilesChange,
})
// 自定义触发器/布局，列表 UI 复用 <FileList files={files} onRemove={...} onRetry={...} />
```

| 方法         | 说明                                  |
| ------------ | ------------------------------------- |
| `addFiles`   | 接收 `File[]`，自动转换并触发上传     |
| `handleDrop` | 直接喂给 `useDropzone` 的 `onDrop`    |
| `remove`     | 移除并 abort 请求                     |
| `retry`      | 重传失败项                            |
| `clear`      | 清空全部                              |

---

## 样式定制

所有组件都接收 `className`（最外层）和 `classNames`（按 slot 细分），通过 `cn()` 合并到默认 class 之后会**覆盖默认样式**（`tailwind-merge`）。颜色全用主题变量（`bg-muted` / `text-destructive` / `border-primary`），跟随主题切换。

```tsx
<DragUpload classNames={{ dropzone: "min-h-[240px] border-blue-500 bg-blue-50/30", title: "text-blue-600" }} />
```
