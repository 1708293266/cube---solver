import { useCallback, useRef } from 'react';
import type React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

// ============================================================
// SearchDropdown — 通用搜索结果下拉面板
//
// 能力：
// - 鼠标点击选择
// - 鼠标 hover 时高亮，离开不高亮
// - 滚动到底部自动加载更多
// - 统一空状态 / 加载中 / 错误态
// - 条目视觉由外部通过 renderDropdownItem 完全自定义
// ============================================================

const SCROLL_THRESHOLD_PX = 20;

export interface DropdownItemState {
  /** 当前项是否已被选中 */
  selected: boolean;
  /** 是否多选模式 */
  multiple: boolean;
}

export interface SearchDropdownProps<T> {
  results: T[];
  query: string;
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  multiple: boolean;
  hasMore: boolean;
  onSelect: (item: T) => void;
  onLoadMore: () => void;
  /** 获取条目唯一 ID */
  getItemId: (item: T) => string;
  /** 渲染单个下拉条目，整行点击/悬停交互由外层统一处理 */
  renderDropdownItem: (item: T, state: DropdownItemState) => React.ReactNode;
  /** 有关键字但搜索无结果的提示文案 */
  emptyText?: string;
  /** 尚未输入关键字时的占位提示文案 */
  placeholderText?: string;
  className?: string;
}

export function SearchDropdown<T>({
  results,
  query,
  loading,
  error,
  selectedIds,
  multiple,
  hasMore,
  onSelect,
  onLoadMore,
  getItemId,
  renderDropdownItem,
  emptyText = '未找到匹配结果',
  placeholderText = '输入关键字搜索',
  className,
}: SearchDropdownProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      const isNearBottom =
        element.scrollTop + element.clientHeight >= element.scrollHeight - SCROLL_THRESHOLD_PX;
      if (isNearBottom && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore],
  );

  const showEmpty = !loading && !error && results.length === 0;

  return (
    <div
      className={cn(
        'absolute z-50 mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-md',
        className,
      )}
    >
      <div
        ref={listRef}
        className="max-h-[280px] overflow-y-auto py-1"
        onScroll={handleScroll}
      >
        {/* 初始加载 */}
        {loading && results.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            搜索中…
          </div>
        )}

        {/* 错误态 */}
        {error && (
          <div className="py-6 text-center text-sm text-destructive">{error}</div>
        )}

        {/* 空态 */}
        {showEmpty && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {query ? emptyText : placeholderText}
          </div>
        )}

        {/* 结果列表 */}
        {results.map((item) => {
          const id = getItemId(item);
          const selected = selectedIds.has(id);
          return (
            <div
              key={id}
              role="option"
              aria-selected={selected}
              className="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(event) => {
                // 避免 input 失焦导致下拉关闭
                event.preventDefault();
              }}
              onClick={() => onSelect(item)}
            >
              {renderDropdownItem(item, { selected, multiple })}
            </div>
          );
        })}

        {/* 加载更多 */}
        {loading && results.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Spinner className="h-3 w-3" />
            加载更多…
          </div>
        )}
      </div>
    </div>
  );
}
