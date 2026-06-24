import type { Employee } from '@/types/contacts';

// ============================================================
// EmployeeSelector — 共享类型与常量
//
// 通过 multiple + objectValue 两个 prop 决定 value / onChange 的具体类型：
//   objectValue 不传或 false （默认）→ ID 字符串模式： value/onChange 为 string
//   objectValue={true}           → 对象模式：    value/onChange 为 Employee
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
 * <EmployeeSelector
 *   value={form.emp_id}
 *   onChange={(v) => setForm({ ...form, emp_id: v ?? '' })}
 * />
 * ```
 */
interface EmployeeSingleIdProps extends BaseProps {
  multiple?: false;
  /**
   * 控制 `value` / `onChange` 的数据格式。
   * - `false`（默认，不传即表示此分支）→ **ID 字符串模式**：value 为 `emp_id` 字符串，onChange 回传 `string | null`
   * - `true` → **对象模式**：value 为 `Employee` 对象，onChange 回传 `Employee | null`
   */
  objectValue?: false;
  value?: string | null;
  onChange?: (v: string | null) => void;
}

/**
 * 单选 · 对象模式（`objectValue={true}`）
 *
 * ```tsx
 * <EmployeeSelector objectValue value={emp} onChange={setEmp} />
 * ```
 */
interface EmployeeSingleObjectProps extends BaseProps {
  multiple?: false;
  /**
   * `true` → **对象模式**：value 为 `Employee` 对象，onChange 回传 `Employee | null`。
   * 不传或为 `false` 则进入 ID 字符串模式。
   */
  objectValue: true;
  value?: Employee | null;
  onChange?: (v: Employee | null) => void;
}

/**
 * 多选 · ID 字符串数组模式（默认）
 *
 * ```tsx
 * <EmployeeSelector
 *   multiple
 *   value={form.emp_ids}
 *   onChange={(v) => setForm({ ...form, emp_ids: v })}
 * />
 * ```
 */
interface EmployeeMultiIdProps extends BaseProps {
  multiple: true;
  objectValue?: false;
  value?: string[];
  onChange?: (v: string[]) => void;
}

/**
 * 多选 · 对象数组模式（`objectValue={true}`）
 *
 * ```tsx
 * <EmployeeSelector multiple objectValue value={employees} onChange={setEmployees} />
 * ```
 */
interface EmployeeMultiObjectProps extends BaseProps {
  multiple: true;
  objectValue: true;
  value?: Employee[];
  onChange?: (v: Employee[]) => void;
}

export type EmployeeSelectorProps =
  | EmployeeSingleIdProps
  | EmployeeSingleObjectProps
  | EmployeeMultiIdProps
  | EmployeeMultiObjectProps;

// ---- 常量 ----

export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_PAGE_LIMIT = 20;
