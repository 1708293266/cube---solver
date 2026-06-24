// ============================================================
// DeptSelector — 统一导出入口
//
// 完整组件导入示例：
//   import { DeptSelector } from './dept-selector';
//
// 搜索下拉 / 防抖搜索已统一到 @/components/selector。
// ============================================================

export { DeptSelector } from './DeptSelector';
export { DeptChip, DeptLabel } from './DeptChip';
export type { DeptChipProps, DeptLabelProps } from './DeptChip';
export { DeptTreeModal } from './DeptTreeModal';
export type { DeptTreeModalProps } from './DeptTreeModal';

// Hooks
export { useDeptTree } from './useDeptTree';
export type { UseDeptTreeReturn, BreadcrumbItem } from './useDeptTree';
export { useSingleDeptResolve, useMultiDeptResolve, clearDeptDetailCache } from './useDeptResolve';

// Display 组件（纯展示，适用于表格列 / 详情页 / 卡片）
export { DeptDisplay, DeptListDisplay } from './DeptDisplay';
export type { DeptDisplayProps, DeptListDisplayProps } from './DeptDisplay';

// API 函数
export { fetchDeptTree, searchDepts, fetchDeptById } from './api';

// 类型与常量
export type { DeptSelectorProps } from './types';
export { SEARCH_DEBOUNCE_MS, DEFAULT_SEARCH_LIMIT } from './types';
