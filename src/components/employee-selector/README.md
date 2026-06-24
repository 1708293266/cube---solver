# EmployeeSelector 通讯录选人组件

通讯录人员选择器，支持单选/多选、受控/非受控、只读模式。

搜索/下拉交互已统一到 [`@/components/selector`](../selector)，本目录仅负责人员域的 API 接入、Chip/下拉条目渲染、emp_id 自动回显 Hook。

## 目录结构

```
employee-selector/
├── index.ts                  # Barrel export
├── types.ts                  # 共享类型 & 常量
├── api.ts                    # API 层（搜索 & 查询）
├── EmployeeSelector.tsx      # 主组合组件（表单编辑）
├── EmployeeDisplay.tsx       # 纯展示组件（EmployeeDisplay + EmployeeListDisplay）
├── EmployeeAvatar.tsx        # 原子组件：头像
├── EmployeeChip.tsx          # 原子组件：可移除标签（EmployeeChip）+ 单选头像姓名（EmployeeLabel）
├── useEmployeeResolve.ts     # Hook + resolveEmployee + 模块级缓存（emp_id → Employee 自动回显）
└── README.md                 # 本文档
```

## 🚨 必读：API 心智模型

### 两种模式，由 `objectValue` 显式切换

| 模式 | `objectValue` | `value` 类型 | `onChange` 类型 | 适用场景 |
| ------ | ------------- | ------------ | -------------- | -------- |
| **ID 字符串模式**（默认） | 不传 / `false` | `string \| null` | `(v: string \| null) => void` | 表单字段存 `emp_id` 字符串，直接对接 |
| **对象模式** | `objectValue` | `Employee \| null` | `(v: Employee \| null) => void` | 需要完整 `Employee` 对象时使用 |
| **多选 ID 模式**（默认） | 不传 / `false` | `string[]` | `(v: string[]) => void` | 表单字段存 `emp_id[]` |
| **多选对象模式** | `objectValue` | `Employee[]` | `(v: Employee[]) => void` | 需要完整 `Employee[]` 时使用 |

### 标准模板（表单字段存 `emp_id` 字符串）

**默认 ID 字符串模式（推荐）**：`value` 和 `onChange` 直接是字符串，无需中转转换。

```tsx
import { EmployeeSelector } from '@/components/employee-selector';

// 单选：表单字段是 emp_id 字符串
<EmployeeSelector
  value={formData.emp_id}
  onChange={(v) => setFormData((p) => ({ ...p, emp_id: v ?? '' }))}
/>

// 多选：表单字段是 emp_id 字符串数组
<EmployeeSelector
  multiple
  value={formData.emp_ids}
  onChange={(v) => setFormData((p) => ({ ...p, emp_ids: v }))}
/>
```

组件内部会自动根据 `value`（emp_id）拉取员工详情回显头像 + 姓名，无需额外操作。

### 对象模式（需要完整 Employee 对象时使用）

```tsx
// 单选对象模式
const [emp, setEmp] = useState<Employee | null>(null);
<EmployeeSelector objectValue value={emp} onChange={setEmp} />

// 多选对象模式
const [emps, setEmps] = useState<Employee[]>([]);
<EmployeeSelector multiple objectValue value={emps} onChange={setEmps} />
```

### 四条铁律

1. **`value` 默认是字符串**：不传 `objectValue` 时，`value` = `string | null`，`onChange` 回传 `string | null`。
2. **`objectValue` 控制对象模式**：`objectValue={true}` 时 `value`/`onChange` 才是 `Employee` 对象。
3. **不要硬拼伪对象**：不要写 `value={{ emp_id: id, name: '' } as any}`，用 `value={id}` 让组件自己 fetch 回显。
4. **`value` 必配 `onChange`**：永远不要写 `onChange={() => {}}` 或省略它，否则用户无法选择。

### 反例集

```tsx
// ❌ 1：传了 value 缺 onChange / onChange 是 noop
<EmployeeSelector value={formData.emp_id} />
<EmployeeSelector value={formData.emp_id} onChange={() => {}} />

// ❌ 2：混淆模式——不传 objectValue 却把 Employee 对象当 value
<EmployeeSelector value={emp} onChange={(v) => setEmp(v as Employee)} />
// ✅ 改成：显式指定 objectValue
<EmployeeSelector objectValue value={emp} onChange={setEmp} />

// ❌ 3：硬拼伪 Employee 对象（旧习惯）
<EmployeeSelector
  value={formData.emp_id ? ({ emp_id: formData.emp_id, name: '' } as any) : null}
  onChange={(emp: any) => setFormData({ ...formData, emp_id: emp?.emp_id || '' })}
/>
// ✅ 只需要 ID 字符串：直接用字符串 value
<EmployeeSelector
  value={formData.emp_id}
  onChange={(v) => setFormData((p) => ({ ...p, emp_id: v ?? '' }))}
/>
// ✅ 需要完整 Employee 对象：传 objectValue
<EmployeeSelector objectValue value={emp} onChange={setEmp} />
```

## 导入

```tsx
// 主组件
import { EmployeeSelector } from '@/components/employee-selector';

// 展示组件
import { EmployeeDisplay, EmployeeListDisplay } from '@/components/employee-selector';

// 原子组件 / Hook / API
import {
  EmployeeAvatar,
  EmployeeChip,
  EmployeeLabel,
  useSingleEmployeeResolve,
  useMultiEmployeeResolve,
  clearEmployeeDetailCache,
  fetchEmployeeById,
  searchEmployees,
} from '@/components/employee-selector';
```

## 其他用法

### 对象模式（已持有完整 `Employee` 对象）

```tsx
// 单选
const [emp, setEmp] = useState<Employee | null>(null);
<EmployeeSelector objectValue value={emp} onChange={setEmp} />

// 多选
const [emps, setEmps] = useState<Employee[]>([]);
<EmployeeSelector multiple objectValue value={emps} onChange={setEmps} />
```

### 非受控（临时选择，外部不持值）

```tsx
<EmployeeSelector onChange={(emp) => console.log('选中:', !Array.isArray(emp) && emp?.name)} />
<EmployeeSelector multiple onChange={(emps) => console.log('选中人数:', Array.isArray(emps) ? emps.length : 0)} />
```

### 只读 / 禁用

```tsx
<EmployeeSelector readOnly value="2825767874" onChange={() => {}} />
<EmployeeSelector readOnly multiple value={['id1', 'id2']} onChange={() => {}} />
<EmployeeSelector disabled onChange={() => {}} />
```

### 纯展示（表格列 / 详情页，禁止直接渲染 emp_id）

```tsx
<EmployeeDisplay empId={record.owner_emp_id} />
<EmployeeListDisplay empIds={record.member_emp_ids} />
<EmployeeDisplay empId={record.owner_emp_id} size={20} />
<EmployeeListDisplay empIds={record.member_emp_ids} maxDisplay={3} />
```

## Props 参考

### EmployeeSelector

| Prop          | 类型                                                        | 默认値       | 说明                                            |
| ------------- | ----------------------------------------------------------- | ------------ | ----------------------------------------------- |
| `multiple`    | `boolean`                                                   | `false`      | 多选模式                                        |
| `objectValue` | `true`                                                      | —            | 传入后开启对象模式：`value`/`onChange` 为 `Employee` 对象而非字符串 |
| `value`       | `string \| null` / `string[]` / `Employee \| null` / `Employee[]` | —     | 受控值。默认为字符串 ID；传 `objectValue` 后为 Employee 对象 |
| `onChange`    | `(v: string \| null) => void` / `(v: string[]) => void` / `(v: Employee \| null) => void` / `(v: Employee[]) => void` | **必填** | 值变更回调，类型与 `objectValue` + `multiple` 对应 |
| `readOnly`    | `boolean`                                                   | `false`      | 只读模式                                        |
| `placeholder` | `string`                                                    | `'搜索人员'` | 输入框占位文本                                  |
| `disabled`    | `boolean`                                                   | `false`      | 禁用交互                                        |
| `className`   | `string`                                                    | —            | 根容器额外 CSS class                            |

### EmployeeDisplay

| Prop        | 类型                       | 默认值   | 说明                                    |
| ----------- | -------------------------- | -------- | --------------------------------------- |
| `empId`     | `string \| null \| undefined` | —      | 单个 emp_id，自动 fetch 展示           |
| `size`      | `number`                   | `24`     | 头像像素尺寸                              |
| `className` | `string`                   | —        | 额外 CSS class                           |

### EmployeeListDisplay

| Prop         | 类型                          | 默认值   | 说明                                    |
| ------------ | ----------------------------- | -------- | --------------------------------------- |
| `empIds`     | `string[] \| null \| undefined` | —      | emp_id 数组，自动 fetch 展示          |
| `maxDisplay` | `number`                    | `5`      | 最多展示数量，超出显示 +N                |
| `className`  | `string`                    | —        | 额外 CSS class                           |

### EmployeeAvatar

| Prop        | 类型       | 默认值   | 说明           |
| ----------- | ---------- | -------- | -------------- |
| `employee`  | `Employee` | **必填** | 员工数据       |
| `size`      | `number`   | `32`     | 像素尺寸       |
| `className` | `string`   | —        | 额外 CSS class |

### EmployeeChip

多选场景下可移除的员工标签（Badge 背景 + 头像 + ×）。`EmployeeListDisplay` 多选展示也复用该组件（`removable={false}`）。

| Prop        | 类型               | 默认值   | 说明             |
| ----------- | ------------------ | -------- | ---------------- |
| `employee`  | `Employee`         | **必填** | 员工数据         |
| `removable` | `boolean`          | `true`   | 是否显示移除按钮 |
| `onRemove`  | `(emp, e) => void` | —        | 移除回调         |
| `className` | `string`           | —        | 额外 CSS class   |

### EmployeeLabel

单选场景下的头像+姓名展示（无 Badge 背景）。`EmployeeSelector` 只读单选 / `EmployeeDisplay` 都复用该组件。

| Prop        | 类型       | 默认值   | 说明             |
| ----------- | ---------- | -------- | ---------------- |
| `employee`  | `Employee` | **必填** | 员工数据         |
| `size`      | `number`   | `24`     | 头像像素尺寸     |
| `className` | `string`   | —        | 额外 CSS class   |

## Hooks

### useSingleEmployeeResolve(empId, currentValue, onResolved)

当 `empId` 变化且当前值与之不匹配时，自动调用 `fetchEmployeeById` 将 `empId` 解析为 `Employee` 对象并回传。

### useMultiEmployeeResolve(empIds, currentValue, onResolved)

多选版本：自动将 `empIds` 数组解析为 `Employee[]` 用于回显。

### clearEmployeeDetailCache()

清空 `resolveEmployee` 建立的详情缓存（从 `./useEmployeeResolve` 导出）。测试或需要强制刷新详情时使用。

## API 函数

### fetchEmployeeById(id: string): Promise\<Employee | null\>

按 emp_id 获取单个员工信息。

### searchEmployees(query, offset?, limit?): Promise\<SearchApiResult\<Employee\>\>

搜索员工，返回统一的 `{ has_more, offset, total, items }` 结构，可直接作为 `@/components/selector` 中 `useSearch` / `Selector` 的 `searchApi` 使用。

## 与通用 Selector 的关系

`EmployeeSelector` 通过传入 `searchApi={searchEmployees}`、`renderChip`、`renderReadOnlySingle` 和 `renderDropdownItem` 使用 `@/components/selector` 下的通用 `Selector`，无需自行实现防抖搜索、下拉开闭与滚动加载。

多选/单选的选中标识：

- 多选：`@/components/ui/checkbox` 的 shadcn `Checkbox`（`pointer-events-none`，交互交给行点击）
- 单选：`lucide-react` 的 `Check` 图标 + `opacity` 切换（未选中时占位，保持布局稳定）

颜色一律使用 shadcn 语义化 tailwind token（`text-foreground` / `text-muted-foreground` / `text-primary` / `bg-accent` 等），随主题自动切换。

下拉条目高亮为 **纯鼠标 hover**（无键盘导航）：鼠标悬停时 `bg-accent text-accent-foreground`，离开即恢复。
