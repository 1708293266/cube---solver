import React, { useState, useEffect } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import type { DeptItem } from '@/types/department';
import { cn } from '@/lib/utils';
import { useSearch } from '@/components/selector';
import { searchDepts } from './api';
import { TreeIcon } from './DeptSelector';
import { useDeptTree } from './useDeptTree';

// ============================================================
// DeptTreeModal — 浏览部门树的全屏弹窗
//
// 左侧：面包屑 + 树列表（或搜索结果）
// 右侧：已选部门列表，支持逐个移除
// ============================================================

export interface DeptTreeModalProps {
  open: boolean;
  onClose: () => void;
  /** 弹窗打开时的初始选中项 */
  initialSelected: DeptItem[];
  multiple?: boolean;
  onConfirm: (selected: DeptItem[]) => void;
}

export function DeptTreeModal({
  open,
  onClose,
  initialSelected,
  multiple = false,
  onConfirm,
}: DeptTreeModalProps) {
  const [tempSelected, setTempSelected] = useState<DeptItem[]>([]);
  const [modalQuery, setModalQuery] = useState('');

  const tree = useDeptTree();
  const search = useSearch<DeptItem>(modalQuery, { searchApi: searchDepts });

  // 弹窗打开时重置内部状态
  useEffect(() => {
    if (open) {
      setTempSelected([...initialSelected]);
      setModalQuery('');
      tree.resetTree();
      tree.loadChildren('-1');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const tempSelectedIds = new Set(tempSelected.map((department) => department.dept_id));
  const showSearch = modalQuery.trim().length > 0;

  // 统一后的 DeptItem 自带 has_children / dept_full_path，不再需要单独维护 treeNode
  const leftPanelItems: DeptItem[] = showSearch ? search.results : tree.currentNodes;

  // 全选：多选模式下，只要当前列表有值就展示全选按钮
  const canSelectAll = multiple && leftPanelItems.length > 0;
  const allTopSelected =
    leftPanelItems.length > 0 &&
    leftPanelItems.every((item) => tempSelectedIds.has(item.dept_id));

  function toggleSelection(department: DeptItem) {
    if (multiple) {
      const exists = tempSelected.find((item) => item.dept_id === department.dept_id);
      if (exists) {
        setTempSelected(tempSelected.filter((item) => item.dept_id !== department.dept_id));
      } else {
        setTempSelected([...tempSelected, department]);
      }
    } else {
      setTempSelected([department]);
    }
  }

  function handleToggleSelectAllTop() {
    if (allTopSelected) {
      // 取消全选：移除当前列表中的项
      const visibleIds = new Set(leftPanelItems.map((item) => item.dept_id));
      setTempSelected(tempSelected.filter((item) => !visibleIds.has(item.dept_id)));
    } else {
      // 全选：批量追加未选的项
      const existingIds = new Set(tempSelected.map((item) => item.dept_id));
      const toAdd = leftPanelItems.filter((item) => !existingIds.has(item.dept_id));
      setTempSelected([...tempSelected, ...toAdd]);
    }
  }

  function handleConfirm() {
    onConfirm(tempSelected);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className="flex h-[min(500px,calc(100vh-40px))] w-[640px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl bg-background text-foreground shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 弹窗标题 */}
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-base font-semibold text-foreground">选择部门</h3>
        </div>

        {/* 主体区 */}
        <div className="flex flex-1 min-h-0 px-6">
          {/* 左侧面板 */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 pr-4 border-r border-border">
            {/* 搜索输入框 */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 border border-input rounded-lg text-sm bg-background outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
                placeholder="搜索部门"
                value={modalQuery}
                onChange={(event) => setModalQuery(event.target.value)}
              />
            </div>

            {/* Breadcrumb — 始终保留；当前列表有值时右侧挂载全选按钮 */}
            <Breadcrumb
              stack={tree.breadcrumbStack}
              onNavigate={tree.navigateBack}
              showSelectAll={canSelectAll}
              allSelected={allTopSelected}
              onToggleSelectAll={handleToggleSelectAllTop}
            />

            {/* 部门列表 */}
            <div className="flex-1 overflow-y-auto -mx-1">
              {(tree.loading || search.loading) && (
                <div className="py-8 text-center text-muted-foreground text-sm">加载中...</div>
              )}
              {!tree.loading && !search.loading && leftPanelItems.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {showSearch ? '未找到匹配部门' : '暂无子部门'}
                </div>
              )}
              {!tree.loading && !search.loading && leftPanelItems.map((department) => {
                const isChecked = tempSelectedIds.has(department.dept_id);
                // 非搜索模式下且有下级时才允许继续下钻
                const canNavigate = !showSearch && department.has_children === true;
                return (
                  <DeptTreeRow
                    key={department.dept_id}
                    department={department}
                    checked={isChecked}
                    multiple={multiple}
                    onToggle={() => toggleSelection(department)}
                    onNavigateInto={canNavigate ? () => tree.navigateInto(department) : undefined}
                  />
                );
              })}
            </div>
          </div>

          {/* 右侧面板——已选列表 */}
          <SelectedPanel
            selected={tempSelected}
            onRemove={(department) =>
              setTempSelected(tempSelected.filter((item) => item.dept_id !== department.dept_id))
            }
            onClear={() => setTempSelected([])}
          />
        </div>

        {/* 底部操作条 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border mt-2">
          <button
            type="button"
            className="px-4 py-2 text-sm text-foreground border border-input rounded-lg hover:bg-accent"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
            onClick={handleConfirm}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 内部子组件
// ============================================================

function Breadcrumb({
  stack,
  onNavigate,
  showSelectAll,
  allSelected,
  onToggleSelectAll,
}: {
  stack: Array<{ id: string; name: string }>;
  onNavigate: (index: number) => void;
  showSelectAll?: boolean;
  allSelected?: boolean;
  onToggleSelectAll?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground flex-wrap">
      <button
        type="button"
        className={cn(
          'hover:text-primary hover:underline',
          stack.length === 0 && 'font-medium text-foreground',
        )}
        onClick={() => onNavigate(-1)}
      >
        全部
      </button>
      {stack.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="size-3" />
          <button
            type="button"
            className={cn(
              'hover:text-primary hover:underline',
              index === stack.length - 1 && 'font-medium text-foreground',
            )}
            onClick={() => onNavigate(index)}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
      {showSelectAll && onToggleSelectAll && (
        <button
          type="button"
          className="ml-auto text-xs text-primary hover:text-primary/90"
          onClick={onToggleSelectAll}
        >
          {allSelected ? '取消全选' : '全选'}
        </button>
      )}
    </div>
  );
}

function DeptTreeRow({
  department,
  checked,
  multiple,
  onToggle,
  onNavigateInto,
}: {
  department: DeptItem;
  checked: boolean;
  multiple: boolean;
  onToggle: () => void;
  onNavigateInto?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
      onClick={onToggle}
    >
      {multiple ? (
        <span
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded border',
            checked ? 'border-primary bg-primary' : 'border-input',
          )}
        >
          {checked && (
            <svg className="size-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      ) : (
        <span
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
            checked ? 'border-primary' : 'border-input',
          )}
        >
          {checked && <span className="size-2 rounded-full bg-primary" />}
        </span>
      )}

      <span className="flex-1 min-w-0 truncate text-sm text-foreground">
        {department.name}
      </span>

      {onNavigateInto && (
        <button
          type="button"
          className="flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md bg-primary/5 px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/15"
          onClick={(event) => {
            event.stopPropagation();
            onNavigateInto();
          }}
        >
          <TreeIcon className="w-3.5 h-3.5" />
          下级
        </button>
      )}
    </div>
  );
}

function SelectedPanel({
  selected,
  onRemove,
  onClear,
}: {
  selected: DeptItem[];
  onRemove: (department: DeptItem) => void;
  onClear: () => void;
}) {
  return (
    <div className="w-[200px] flex flex-col pl-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">已选择({selected.length})</span>
        {selected.length > 0 && (
          <button
            type="button"
            className="text-sm text-primary hover:text-primary/90"
            onClick={onClear}
          >
            清空
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {selected.length === 0 && (
          <div className="py-4 text-center text-muted-foreground text-xs">暂无选择</div>
        )}
        {selected.map((department) => (
          <div
            key={department.dept_id}
            className="flex items-center justify-between py-1.5 group"
          >
            <span className="text-sm text-foreground truncate">{department.name}</span>
            <button
              type="button"
              className="text-muted-foreground/60 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              onClick={() => onRemove(department)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

