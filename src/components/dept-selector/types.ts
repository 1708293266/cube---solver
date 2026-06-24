import type { DeptItem } from '@/types/department';

// ============================================================
// DeptSelector — 共享类型与常量
//
// 通过 multiple + objectValue 两个 prop 决定 value / onChange 的具体类型：
//   objectValue 不传或 false（默认）→ ID 字符串模式：value/onChange 为 string
//   objectValue={true}           → 对象模式：    value/onChange 为 DeptItem
// ============================================================

type BaseProps = {
  readOnly?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** 根容器额外 CSS class */
  className?: string;
};

/**
 * 单选 · ID 字符串模式（默认）
 *
 * ```tsx
 * <DeptSelector
 *   value={form.dept_id}
 *   onChange={(v) => setForm({ ...form, dept_id: v ?? '' })}
 * />
 * ```
 */
interface DeptSingleIdProps extends BaseProps {
  multiple?: false;
  /**
   * 控制 `value` / `onChange` 的数据格式。
   * - `false`（默认，不传即表示此分支）→ **ID 字符串模式**：value 为 `dept_id` 字符串，onChange 回传 `string | null`
   * - `true` → **对象模式**：value 为 `DeptItem` 对象，onChange 回传 `DeptItem | null`
   */
  objectValue?: false;
  value?: string | null;
  onChange?: (v: string | null) => void;
}

/**
 * 单选 · 对象模式（`objectValue={true}`）
 *
 * ```tsx
 * <DeptSelector objectValue value={dept} onChange={setDept} />
 * ```
 */
interface DeptSingleObjectProps extends BaseProps {
  multiple?: false;
  /**
   * `true` → **对象模式**：value 为 `DeptItem` 对象，onChange 回传 `DeptItem | null`。
   * 不传或为 `false` 则进入 ID 字符串模式。
   */
  objectValue: true;
  value?: DeptItem | null;
  onChange?: (v: DeptItem | null) => void;
}

/**
 * 多选 · ID 字符串数组模式（默认）
 *
 * ```tsx
 * <DeptSelector
 *   multiple
 *   value={form.dept_ids}
 *   onChange={(v) => setForm({ ...form, dept_ids: v })}
 * />
 * ```
 */
interface DeptMultiIdProps extends BaseProps {
  multiple: true;
  objectValue?: false;
  value?: string[];
  onChange?: (v: string[]) => void;
}

/**
 * 多选 · 对象数组模式（`objectValue={true}`）
 *
 * ```tsx
 * <DeptSelector multiple objectValue value={depts} onChange={setDepts} />
 * ```
 */
interface DeptMultiObjectProps extends BaseProps {
  multiple: true;
  objectValue: true;
  value?: DeptItem[];
  onChange?: (v: DeptItem[]) => void;
}

export type DeptSelectorProps =
  | DeptSingleIdProps
  | DeptSingleObjectProps
  | DeptMultiIdProps
  | DeptMultiObjectProps;

// ---- 常量 ----

export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_SEARCH_LIMIT = 50;
