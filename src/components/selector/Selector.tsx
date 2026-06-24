import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { SearchDropdown, type DropdownItemState } from './SearchDropdown';
import { useSearch, type SearchApi } from './useSearch';

// ============================================================
// Selector — 通用搜索选择器组件
//
// 提供统一的单选/多选交互：
// - 内联搜索输入框 + 标签（多选）或文本展示（单选）
// - 绝对定位的搜索结果下拉面板（基于 SearchDropdown）
// - 点击外部关闭下拉
// - 清空按钮
//
// 外部只需要传入 searchApi + renderDropdownItem 即可完成搜索面板；
// Chip 通过 renderChip 自定义；其它动作通过 extraActions。
// ============================================================

export interface SelectorProps<T> {
  /** 从选项中提取唯一标识 */
  getItemId: (item: T) => string;
  /** 从选项中提取展示文本 */
  getItemLabel: (item: T) => string;
  /** 当前已选中的项（内部统一为数组） */
  items: T[];
  /** 选中项变更回调 */
  onItemsChange: (items: T[]) => void;
  /** 是否开启多选模式 */
  multiple?: boolean;
  /** 输入框占位文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 只读模式，展示已选内容但不可编辑 */
  readOnly?: boolean;
  /** 外层容器额外的 CSS 类名 */
  className?: string;
  /** 渲染多选标签 */
  renderChip: (
    item: T,
    onRemove: (item: T, event: React.MouseEvent) => void,
    readOnly: boolean,
  ) => React.ReactNode;
  /** 搜索接口：入参 (query, offset, limit)，出参 { has_more, offset, total, items } */
  searchApi: SearchApi<T>;
  /** 渲染下拉结果中的单个条目 */
  renderDropdownItem: (item: T, state: DropdownItemState) => React.ReactNode;
  /** 每页搜索条数 */
  searchLimit?: number;
  /** 搜索输入防抖毫秒数 */
  searchDebounceMs?: number;
  /** 有关键字但搜索无结果的提示文案 */
  dropdownEmptyText?: string;
  /** 尚未输入关键字时的占位提示文案 */
  dropdownPlaceholderText?: string;
  /** 额外的操作按钮（如部门树弹窗触发器），渲染在输入区域内 */
  extraActions?: React.ReactNode;
  /** 只读模式下渲染单个选中项（可选，默认用纯文本） */
  renderReadOnlySingle?: (item: T) => React.ReactNode;
}

export function Selector<T>({
  getItemId,
  getItemLabel,
  items,
  onItemsChange,
  multiple = false,
  placeholder = '请搜索',
  disabled = false,
  readOnly = false,
  className,
  renderChip,
  searchApi,
  renderDropdownItem,
  searchLimit,
  searchDebounceMs,
  dropdownEmptyText,
  dropdownPlaceholderText,
  extraActions,
  renderReadOnlySingle,
}: SelectorProps<T>) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- 搜索状态（由通用 useSearch 驱动） ----
  const { results, loading, error, hasMore, loadMore } = useSearch<T>(query, {
    searchApi,
    limit: searchLimit,
    debounceMs: searchDebounceMs,
  });

  // ---- 关闭下拉并清空搜索词 ----
  const closeDropdown = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
  }, []);

  // ---- 点击外部关闭下拉 ----
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown]);

  // ---- 派生值 ----
  const singleValue = !multiple ? (items[0] ?? null) : null;

  const selectedIds = useMemo(
    () => new Set(items.map((item) => getItemId(item))),
    [items, getItemId],
  );

  // ---- 事件处理 ----
  const handleRemove = useCallback(
    (item: T, event: React.MouseEvent) => {
      event.stopPropagation();
      onItemsChange(items.filter((existing) => getItemId(existing) !== getItemId(item)));
    },
    [items, onItemsChange, getItemId],
  );

  const handleClearAll = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onItemsChange([]);
    },
    [onItemsChange],
  );

  const handleContainerClick = useCallback(() => {
    if (disabled || readOnly) return;
    setSearchOpen(true);
    inputRef.current?.focus();
  }, [disabled, readOnly]);

  // 单选有值时，searchOpen 从 false→true 后 input 才会挂载，需要延迟聚焦
  useEffect(() => {
    if (searchOpen && !multiple && singleValue) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [searchOpen, multiple, singleValue]);

  // ---- 下拉选中处理 ----
  const handleDropdownSelect = useCallback(
    (item: T) => {
      const id = getItemId(item);
      if (multiple) {
        const exists = items.some((existing) => getItemId(existing) === id);
        if (exists) {
          onItemsChange(items.filter((existing) => getItemId(existing) !== id));
        } else {
          onItemsChange([...items, item]);
        }
      } else {
        onItemsChange([item]);
        closeDropdown();
      }
    },
    [multiple, items, onItemsChange, getItemId, closeDropdown],
  );

  // ---- 只读模式 ----
  if (readOnly) {
    if (items.length === 0) {
      return <span className={cn('text-sm text-muted-foreground', className)}>-</span>;
    }
    if (!multiple && singleValue) {
      if (renderReadOnlySingle) {
        return <div className={className}>{renderReadOnlySingle(singleValue)}</div>;
      }
      return (
        <span className={cn('text-sm text-foreground', className)}>
          {getItemLabel(singleValue)}
        </span>
      );
    }
    return (
      <div className={cn('flex flex-wrap gap-1', className)}>
        {items.map((item) => (
          <React.Fragment key={getItemId(item)}>
            {renderChip(item, () => {}, true)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // ---- 渲染 ----
  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* 触发区 / 输入区 */}
      <div
        className={cn(
          'flex min-h-10 items-center gap-2 rounded-lg border bg-background px-3 py-1.5 cursor-text transition-colors',
          searchOpen
            ? 'border-ring ring-2 ring-ring/20'
            : 'border-input hover:border-muted-foreground',
          disabled && 'opacity-50 cursor-not-allowed bg-muted',
        )}
        onClick={handleContainerClick}
      >
        {/* 左侧：标签 / 单选文本 / 输入框，内部可换行 */}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1">
          {/* 单选：非聚焦态展示已选文本 */}
          {!multiple && singleValue && !searchOpen && (
            <span className="flex-1 min-w-0 text-sm text-foreground truncate py-0.5">
              {getItemLabel(singleValue)}
            </span>
          )}

          {/* 多选：标签列表 */}
          {multiple &&
            items.map((item) => (
              <React.Fragment key={getItemId(item)}>
                {renderChip(item, handleRemove, false)}
              </React.Fragment>
            ))}

          {/* 搜索输入框：单选聚焦态或无值时显示；多选始终显示 */}
          {(multiple || searchOpen || !singleValue) && (
            <input
              ref={inputRef}
              type="text"
              className="flex-1 min-w-20 border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
              placeholder={
                multiple
                  ? items.length === 0
                    ? placeholder
                    : ''
                  : singleValue
                    ? getItemLabel(singleValue)
                    : placeholder
              }
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              disabled={disabled}
            />
          )}
        </div>

        {/* 右侧：清空按钮 + 额外动作，常驻右侧垂直居中，不参与换行 */}
        <div className="flex items-center gap-1 shrink-0 self-center">
          {items.length > 0 && !searchOpen && (
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted cursor-pointer"
              onClick={handleClearAll}
              aria-label="清除选择"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          {extraActions}
        </div>
      </div>

      {/* 下拉面板 */}
      {searchOpen && (
        <SearchDropdown<T>
          results={results}
          query={query}
          loading={loading}
          error={error}
          selectedIds={selectedIds}
          multiple={multiple}
          hasMore={hasMore}
          onSelect={handleDropdownSelect}
          onLoadMore={loadMore}
          getItemId={getItemId}
          renderDropdownItem={renderDropdownItem}
          emptyText={dropdownEmptyText}
          placeholderText={dropdownPlaceholderText}
        />
      )}
    </div>
  );
}
