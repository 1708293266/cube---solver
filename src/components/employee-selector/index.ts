// ============================================================
// EmployeeSelector — 统一导出入口
//
// 完整组件导入示例：
//   import { EmployeeSelector } from '@/components/employee-selector';
//
// 搜索下拉 / 防抖搜索已统一到 @/components/selector。
// ============================================================

export { EmployeeSelector } from './EmployeeSelector';
export { EmployeeAvatar } from './EmployeeAvatar';
export type { EmployeeAvatarProps } from './EmployeeAvatar';
export { EmployeeChip, EmployeeLabel } from './EmployeeChip';
export type { EmployeeChipProps, EmployeeLabelProps } from './EmployeeChip';

// Hooks
export {
  useSingleEmployeeResolve,
  useMultiEmployeeResolve,
  clearEmployeeDetailCache,
} from './useEmployeeResolve';

// Display 组件（纯展示，适用于表格列 / 详情页 / 卡片）
export { EmployeeDisplay, EmployeeListDisplay } from './EmployeeDisplay';
export type { EmployeeDisplayProps, EmployeeListDisplayProps } from './EmployeeDisplay';

// API 函数
export { fetchEmployeeById, searchEmployees } from './api';

// 类型与常量
export type { EmployeeSelectorProps } from './types';
export { SEARCH_DEBOUNCE_MS, DEFAULT_PAGE_LIMIT } from './types';
