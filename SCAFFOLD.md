# Frontend Template

AI App 前端脚手架模板，基于 React 18 + React Router DOM 6 + Vite 7 + TypeScript 5 + Tailwind CSS 3 + shadcn/ui 构建。

## 技术栈

- **React 18** — UI 框架
- **React Router DOM 6** — 前端路由
- **Vite 7** — 构建工具，构建目标 ES2015
- **TypeScript 5.8** — 类型系统，bundler 模式
- **Tailwind CSS 3.4** — 原子化 CSS 框架，使用 CSS 变量主题系统
- **shadcn/ui** — 基于 Radix UI 的组件库（default 风格，CSS 变量模式）
- **ESLint 9** — 代码检查
- **PostCSS + Autoprefixer** — CSS 后处理

### 关键依赖

- **class-variance-authority** — 组件变体管理
- **clsx + tailwind-merge** — 条件样式合并（`cn()` 工具函数）
- **Radix UI** — 无障碍原语组件
- **Recharts** — 图表库
- **Embla Carousel** — 轮播组件
- **Sonner** — Toast 通知
- **Vaul** — Drawer 组件
- **cmdk** — Command Palette
- **react-day-picker + date-fns** — 日期选择
- **react-resizable-panels** — 可调整大小面板
- **react-dropzone** — 文件拖拽上传
- **input-otp** — OTP 输入
- **next-themes** — 主题切换
- **lucide-react** — 图标库
- **@tiptap/react + 扩展包** — 富文本编辑器（模块化架构，按需引入）
- **ai-app-client** — AI App 客户端 SDK

## 项目结构

```
src/
├── main.tsx             # 入口文件，副作用导入 `ai-app-client`（注入全局 fetch 拦截器），用 StrictMode 渲染 <App />
├── app.tsx              # 应用根组件，包含 AppProviders + BrowserRouter + Routes 路由定义；特别注意：非特殊情况 AppProviders 与 BrowserRouter 不要去掉；⚠️ 必须引入 app.css。
├── app.css              # 全局样式 & CSS 变量（light/dark 主题） 必须维护在这里，禁止额外创建其他样式文件（如 index.css）。⚠️ 如果 SPEC.md 中提供了CSS 变量值（颜色/字号/间距/圆角等），必须用 SPEC.md 给定的值替换 app.css 中 :root 和 .dark 下的默认变量（如 --primary、--background 等），不要保留默认值。
├── vite-env.d.ts        # Vite 类型声明
├── pages/
│   ├── index.tsx        # 首页示例内容（默认路由 `/`），⚠️ 必须使用真正的首页内容替换掉；
│   └── not-found.tsx    # 404 兜底页（路由 `*`），可按需保留或定制文案
├── lib/
│   ├── utils.ts         # `cn()` 样式合并工具函数
│   ├── url.ts           # **URL 工具的所有导出**：`resolveUrl(url)`（API 请求路径拼 BASE_URL）、`resolveUrl(url, true)` / `toAbsoluteUrl(url)`（图片预览拼 Origin）
│   ├── api.ts           # `apiFetch` 工具：fetch 包装器，自动注入 Authorization header。全局 fetch 拦截已由 ai-app-client 在入口处接管
│   └── auth.ts          # Token 提取工具（优先 window.__SUPABASE_ACCESS_TOKEN__，其次 Cookie access_token）
├── hooks/
│   ├── use-mobile.tsx   # 移动端检测 hook
│   └── use-dark-mode.ts # 暗黑主题 hook，封装 next-themes，提供 isDark / toggle / setTheme 等
├── types/
│   ├── contacts.ts      # 通讯录相关类型定义（Employee, SearchResult, ApiResponse）
│   └── department.ts    # 部门相关类型定义（DeptItem, GetDeptTreeResponse）
└── components/
    ├── ui/              # shadcn/ui 组件目录
    ├── providers/       # AppProviders 全局 Provider（ThemeProvider + Toaster）
    ├── upload/          # 文件上传组件（图片/附件/拖拽）
    ├── employee-selector/  # 人员选择器组件
    ├── dept-selector/      # 部门选择器组件
    ├── selector/           # 通用搜索选择器底层组件
    ├── CurrentUser.tsx     # 当前登录人组件（头像 + Popover 用户信息卡片）
    └── RichEditor.tsx      # 富文本编辑器组件（基于 tiptap）
index.html               # HTML 入口，挂载 #root 节点，加载 /src/main.tsx；特别注意 <title> 内容需要替换为应用实际名称。⚠️ 除非用户明确要求，否则不要删除 index.html 中已有的任何内容（如 <script>、<meta>、注释等），只允许新增或修改，防止误删平台注入的关键配置。
public/app-icon.svg      # 应用图标，需要根据应用实际情况生成，注意规格尺寸要符合 favicon 标准。
supabase/tables/         # Supabase 表定义目录（默认仅占位 .gitkeep，按业务需要新增 SQL 表定义）
```

## 路径别名

使用 `@/*` 映射到 `./src/*`，在 `tsconfig.app.json` 和 `vite.config.ts` 中均已配置。

## shadcn/ui 组件列表

组件位于 `src/components/ui/`，通过 `@/components/ui/<name>` 引用。所有 shadcn/ui 组件都已内置，无需额外生成或者添加 shadcn/ui 组件。

### 表单 & 输入

| 组件 | 文件 | 描述 |
|------|------|------|
| Button | `button.tsx` | 按钮组件，支持 default / destructive / outline / secondary / ghost / link 等变体 |
| Button Group | `button-group.tsx` | 按钮组，将多个按钮组合在一起 |
| Input | `input.tsx` | 文本输入框 |
| Input Group | `input-group.tsx` | 输入框组，支持前缀和后缀附加内容 |
| Input OTP | `input-otp.tsx` | 一次性密码输入组件 |
| Textarea | `textarea.tsx` | 多行文本输入框 |
| Checkbox | `checkbox.tsx` | 复选框 |
| Radio Group | `radio-group.tsx` | 单选按钮组 |
| Select | `select.tsx` | 下拉选择（⚠️ 注意：`<SelectItem>` 的 `value` 属性禁止传空字符串 `""`，否则会抛出运行时错误。如果选项值可能为空，请使用占位符如 `"all"` 或过滤掉空值选项） |
| Switch | `switch.tsx` | 开关切换组件 |
| Slider | `slider.tsx` | 滑块输入组件 |
| Calendar | `calendar.tsx` | 日历组件，用于日期选择（底层组件，单独使用场景较少） |
| DatePicker | `date-picker.tsx` | 日期选择器（业务推荐，Popover + Calendar 封装，单日期选择，引用路径 `@/components/ui/date-picker`，导出 `DatePicker`），表单中日期字段使用此组件 |
| DateRangePicker | `date-picker.tsx` | 日期范围选择器（业务推荐，Popover + Calendar 封装，起止日期选择，引用路径 `@/components/ui/date-picker`，导出 `DateRangePicker`），表单中日期范围字段使用此组件 |
| DateTimePicker | `date-picker.tsx` | 日期时间选择器（业务推荐，Popover + Calendar + 时分秒滚动列封装，引用路径 `@/components/ui/date-picker`，导出 `DateTimePicker`），支持 `minuteStep` / `secondStep` 步长控制和 `showSeconds` 秒列开关，表单中需要同时选择日期和时间的字段使用此组件 |
| Label | `label.tsx` | 表单标签 |
| Field | `field.tsx` | 表单字段组件，包含标签和错误信息 |
| ImageUpload | `@/components/upload/image.tsx` | 图片上传（业务组件，缩略图预览 / 头像、封面、商品图场景）。**`value` 传 URL 字符串，`onChange` 也返回 URL**，默认单图 `string`，传 `multiple` 后为多图 `string[]`，直接对接表单字段；详见下方「内置组件 → Upload」 |
| AttachmentUpload / DragUpload | `@/components/upload/attachment.tsx` · `drag.tsx` | 附件上传（业务组件，列表 / 拖拽两种形态，适合合同、文档、任意附件）。**`value`/`onChange` 均为服务端 `UploadResponse` 对象**：附件/多文件为 `UploadResponse[]`，单文件 Drag 为 `UploadResponse | undefined`；组件内部自动维护 `UploadFile[]` 进度状态，展示名称优先 `originalFileName`，业务侧不要只存 `url`；详见下方「内置组件 → Upload」 |
| RichEditor | `@/components/RichEditor` | 富文本编辑器（基于 tiptap），支持标题/加粗/斜体/下划线/对齐/列表/引用/代码块/链接/图片上传/分割线/撤销重做。`value` 为 HTML 字符串，`onChange` 返回 HTML 字符串；详见下方「内置组件 → RichEditor」 |
| EmployeeSelector | `@/components/employee-selector/EmployeeSelector.tsx` | 人员选择（业务组件，单选 / 多选 / 只读）。**默认 ID 字符串模式**：`value`/`onChange` 直接是 `emp_id` 字符串，组件内部自动回显头像 + 姓名；传 `objectValue` 开启对象模式，`value`/`onChange` 为 `Employee` 对象；详见下方「内置组件 → EmployeeSelector」 |
| DeptSelector | `@/components/dept-selector/DeptSelector.tsx` | 部门选择（业务组件，单选 / 多选 / 只读；内置关键字搜索与部门树浏览弹窗）。**默认 ID 字符串模式**：`value`/`onChange` 直接是 `dept_id` 字符串；传 `objectValue` 开启对象模式，`value`/`onChange` 为 `DeptItem` 对象；详见下方「内置组件 → DeptSelector」 |

### 布局 & 导航

| 组件 | 文件 | 描述 |
|------|------|------|
| Accordion | `accordion.tsx` | 可折叠手风琴组件 |
| Breadcrumb | `breadcrumb.tsx` | 面包屑导航 |
| Navigation Menu | `navigation-menu.tsx` | 无障碍导航菜单，支持下拉子菜单 |
| Sidebar | `sidebar.tsx` | 可折叠侧边栏布局组件 |
| Tabs | `tabs.tsx` | 选项卡切换组件 |
| Separator | `separator.tsx` | 内容分隔线 |
| Scroll Area | `scroll-area.tsx` | 自定义滚动区域，带有样式化滚动条 |
| Resizable | `resizable.tsx` | 可调整大小的面板布局 |

### 弹层 & 对话框

| 组件 | 文件 | 描述 |
|------|------|------|
| Dialog | `dialog.tsx` | 模态对话框 |
| Alert Dialog | `alert-dialog.tsx` | 确认提示对话框 |
| Sheet | `sheet.tsx` | 滑出面板（侧边抽屉） |
| Drawer | `drawer.tsx` | 移动端友好的抽屉组件（基于 Vaul） |
| Popover | `popover.tsx` | 浮动弹出框 |
| Tooltip | `tooltip.tsx` | 工具提示 |
| Hover Card | `hover-card.tsx` | 悬停时显示的卡片 |
| Context Menu | `context-menu.tsx` | 右键上下文菜单 |
| Dropdown Menu | `dropdown-menu.tsx` | 下拉菜单 |
| Menubar | `menubar.tsx` | 水平菜单栏 |
| Command | `command.tsx` | 命令面板（基于 cmdk） |

### 反馈 & 状态

| 组件 | 文件 | 描述 |
|------|------|------|
| Alert | `alert.tsx` | 提示/警告消息组件 |
| Sonner | `sonner.tsx` | Toast 通知组件（基于 Sonner） |
| Progress | `progress.tsx` | 进度条 |
| Spinner | `spinner.tsx` | 加载旋转指示器 |
| Skeleton | `skeleton.tsx` | 骨架屏加载占位 |
| Badge | `badge.tsx` | 徽章标签，用于标签和状态指示 |
| Empty | `empty.tsx` | 空状态组件 |

### 展示 & 媒体

| 组件 | 文件 | 描述 |
|------|------|------|
| Avatar | `avatar.tsx` | 头像组件 |
| Img | `@/components/img` | 图片展示组件，自动处理服务端相对路径，业务图片展示优先使用 |
| Card | `card.tsx` | 卡片容器 |
| Table | `table.tsx` | 数据表格 |
| Chart | `chart.tsx` | 图表组件（基于 Recharts） |
| Carousel | `carousel.tsx` | 轮播组件（基于 Embla Carousel） |
| Aspect Ratio | `aspect-ratio.tsx` | 保持宽高比的容器 |
| Item | `item.tsx` | 通用列表/菜单项组件 |
| Kbd | `kbd.tsx` | 键盘快捷键展示组件 |

### 其他

| 组件 | 文件 | 描述 |
|------|------|------|
| Collapsible | `collapsible.tsx` | 可折叠容器 |
| Toggle | `toggle.tsx` | 切换按钮 |
| Toggle Group | `toggle-group.tsx` | 切换按钮组 |
| Pagination | `pagination.tsx` | 分页组件 |

## 内置组件

脚手架还内置了以下业务组件，位于 `src/components/` 下，可直接通过 `@/components/<name>` 引用，**无需额外安装或生成**。

### Upload（文件上传）

用于上传头像、图片、附件、文档等场景。统一通过 `@/components/upload` 导入，详细文档见 `src/components/upload/README.md`。

**两套 API 模型，请根据场景选择：**

- **图片上传（`ImageUpload`）**：`src/components/upload/image.tsx`
  - `value` / `onChange` 均为 **URL 字符串**：默认单图 `string`，传 `multiple` 后为多图 `string[]`；类型会随 `multiple` 自动收窄
  - 直接对接表单字段：`value={form.image_url}` / `onChange={(url) => setField('image_url', url ?? '')}`，类型已经收窄，不要额外做运行时类型判断
  - `maxCount` 多图时限制最大图片数量，单图固定最多 1 个；需要多图时显式传 `multiple`
  - 组件内部管理 `UploadFile[]` 进度状态，外部无需感知
  - 图片通常只保存 URL 即可，无需关心 `fileName`、`size` 等文件元信息

- **附件上传/拖拽上传（`AttachmentUpload` / `DragUpload`）**：`src/components/upload/attachment.tsx`、`src/components/upload/drag.tsx`
  - `value` / `onChange` 均为服务端返回的 **`UploadResponse` 对象**：附件/多文件为 `UploadResponse[]`，单文件 Drag 为 `UploadResponse | undefined`
  - 组件内部自动转换并维护 `UploadFile[]` 进度状态，外部无需感知内部对象
  - ⚠️ **附件必须保存完整 `UploadResponse` 对象**（含 `fileName` / `originalFileName` / `size` / `contentType`），**不要只存 `url`**，否则展示时无法显示原始文件名和图标
  - 适合合同 / 文档 / 任意类型附件

### RichEditor（富文本编辑器）

基于 tiptap 的富文本编辑器，适用于文章内容、公告、CMS 内容管理等需要富文本输入的场景。

- 位于 `src/components/RichEditor.tsx`，通过 `@/components/RichEditor` 引用。
- 依赖的 tiptap 包已预装在 `package.json` 中，**无需额外安装**。

**Props：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `value` | `string` | HTML 字符串，编辑器内容 |
| `onChange` | `(value: string) => void` | 内容变更回调，返回 HTML 字符串 |
| `placeholder` | `string?` | 占位文本，默认"请输入内容..." |

**功能列表：**
- 标题（H1 / H2 / H3）
- 文本格式：加粗、斜体、下划线、删除线
- 对齐：左对齐、居中、右对齐
- 列表：无序列表、有序列表
- 块级元素：引用、代码块、分割线
- 链接插入
- 图片：URL 插入 + 本地上传（复用 `@/components/upload/api` 的 `uploadFile`）
- 撤销 / 重做

**用法示例：**

```tsx
import RichEditor from '@/components/RichEditor'

const [content, setContent] = useState('')

<RichEditor value={content} onChange={setContent} placeholder="请输入文章内容..." />
```

**注意事项：**
- `value` 和 `onChange` 均为 HTML 字符串，数据库存储为 `TEXT` 类型即可
- 图片上传走平台统一的 OSS 上传接口，返回 URL 自动插入编辑器
- 编辑器自带工具栏，无需额外实现格式控制

### 图片显示规范

业务图片展示必须处理服务端返回的相对路径，允许两种安全写法：

- **优先使用 `Img` 组件**：组件内部会自动处理相对路径，推荐用于详情页、表格卡片、弹窗预览等业务图片展示。
- **使用原生图片标签时必须包裹 URL**：如果确实需要写原生图片标签，`src` 必须使用 `resolveUrl(url, true)` 或 `toAbsoluteUrl(url)`，禁止直接传原始相对路径。

```tsx
import { Img } from "@/components/img"
import { resolveUrl, toAbsoluteUrl } from "@/lib/url"

// ✅ 推荐：使用 Img 组件
<Img src={url} alt="" />

// ✅ 允许：原生图片标签必须包裹 URL
<img src={resolveUrl(url, true)} alt="" />
<img src={toAbsoluteUrl(url)} alt="" />

// ✅ 多图展示优先用 Img
{images.map((url) => (
  <Img key={url} src={url} alt="" />
))}
```

禁止把服务端返回的原始相对路径直接传给原生图片标签的 `src`。

`Img` 组件底层使用 `resolveUrl(url, true)` / `toAbsoluteUrl(url)`，处理逻辑：
- 已是可直接使用的资源地址（`http(s):` / `//` / `data:` / `blob:` / `file:`）→ 原样返回
- 相对路径 → 拼接 `window.location.origin + BASE_URL 前缀`
- 传入 `undefined`/空字符串 → 原样返回，不报错


### EmployeeSelector（人员选择器）（可能存在，使用前需要确认）

用于选择/展示通讯录成员，支持单选/多选/受控/只读模式。

**默认 ID 字符串模式**：`value`/`onChange` 直接是 `emp_id` 字符串，无需中转，组件内部自动回显头像+姓名。传 `objectValue` 开启对象模式。
- 表单输入（可编辑）：`src/components/employee-selector/EmployeeSelector.tsx`
- 纯展示（表格列 / 详情页 / 卡片）：`src/components/employee-selector/EmployeeDisplay.tsx`（同文件导出 `EmployeeDisplay` / `EmployeeListDisplay`）
- 用法示例见 `src/components/README.md`。

### DeptSelector（部门选择器）（可能存在，使用前需要确认）

用于选择/展示组织部门，支持单选/多选/受控/只读模式，内置关键字搜索与部门树浏览弹窗。

**默认 ID 字符串模式**：`value`/`onChange` 直接是 `dept_id` 字符串，无需中转。传 `objectValue` 开启对象模式。
- 表单输入（可编辑）：`src/components/dept-selector/DeptSelector.tsx`
- 纯展示（表格列 / 详情页 / 卡片）：`src/components/dept-selector/DeptDisplay.tsx`（同文件导出 `DeptDisplay` / `DeptListDisplay`）
- 用法示例见 `src/components/README.md`。

### Selector（通用搜索选择器）（可能存在，使用前需要确认）

上述 EmployeeSelector / DeptSelector 共享的底层通用组件，提供防抖搜索、下拉开闭与滚动加载等能力。需要构建其它领域选择器时优先复用，避免重复实现。位于 `src/components/selector/`。

### CurrentUser（当前登录人）

当前登录用户组件，展示 28×28 圆形头像，点击弹出 Popover 显示用户信息卡片和登出按钮。
- 数据来源：`GET /api/contacts/employees/login/user`
- 使用方式：`<CurrentUser />` 或 `<CurrentUser onLogout={() => { /* 清除 token，跳转登录页等 */ }} />`
- 位于 `src/components/CurrentUser.tsx`，通过 `@/components/CurrentUser` 引用。

---

## 主题配置

主题通过 CSS 变量定义在 `src/app.css` 中，支持 light/dark 模式。颜色使用 HSL 格式，在 `tailwind.config.js` 中通过 `hsl(var(--<token>))` 引用。

核心 design tokens：`--background`、`--foreground`、`--primary`、`--secondary`、`--muted`、`--accent`、`--destructive`、`--border`、`--input`、`--ring`、`--radius`。
