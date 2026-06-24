// ============================================================
// Selector — Barrel export
//
// 通用搜索选择器组件族：
//   import { Selector } from '@/components/selector';
//
// 搭配 useSearch（防抖 + 分页）+ SearchDropdown（键盘导航）。
// ============================================================

export { Selector } from './Selector';
export type { SelectorProps } from './Selector';

export { SearchDropdown } from './SearchDropdown';
export type { SearchDropdownProps, DropdownItemState } from './SearchDropdown';

export {
  useSearch,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_DEBOUNCE_MS,
} from './useSearch';
export type {
  SearchApi,
  SearchApiResult,
  UseSearchOptions,
  UseSearchReturn,
} from './useSearch';
