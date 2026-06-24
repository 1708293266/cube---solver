import { useCallback, useState } from 'react';
import type { DeptItem } from '@/types/department';
import type { DeptSelectorProps } from './types';
import { Selector } from '@/components/selector';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchDepts } from './api';
import { DeptChip, DeptLabel } from './DeptChip';
import { DeptTreeModal } from './DeptTreeModal';
import { useSingleDeptResolve, useMultiDeptResolve } from './useDeptResolve';

// ============================================================
// DeptSelector — 部门选择器
//
// 支持单选/多选、受控/非受控、只读模式。
// value 支持两种模式：
//   字符串模式： value 为 dept_id / dept_id[]，onChange 回传 string | null / string[]
//   对象模式： value 为 DeptItem | DeptItem[]，onChange 回传 DeptItem | null / DeptItem[]
// ============================================================

/** 根据 multiple 标准化外部传入的 value 为内部统一的数组形式 */
function normalizeValue(
  propValue: DeptItem[] | DeptItem | null | undefined,
  fallback: DeptItem[],
): DeptItem[] {
  if (propValue === undefined || propValue === null) return fallback || [];
  return Array.isArray(propValue) ? propValue : [propValue];
}

export function DeptSelector(props: DeptSelectorProps) {
  const {
    multiple = false,
    readOnly = false,
    placeholder = '请输入关键字进行搜索',
    disabled = false,
    className,
  } = props;

  // ---- 内部状态（非受控模式） ----
  const [internalItems, setInternalItems] = useState<DeptItem[]>([]);
  const items = props.objectValue === true
    ? normalizeValue(props.value, internalItems)
    : internalItems;

  const emitChange = useCallback(
    (nextItems: DeptItem[]) => {
      setInternalItems(nextItems);
      if (props.objectValue === true) {
        // 对象模式：回传 DeptItem
        if (props.multiple === true) {
          props.onChange?.(nextItems);
        } else {
          props.onChange?.(nextItems[0] ?? null);
        }
      } else {
        // ID 字符串模式：回传 dept_id
        if (props.multiple === true) {
          props.onChange?.(nextItems.map((dept) => dept.dept_id));
        } else {
          props.onChange?.(nextItems[0]?.dept_id ?? null);
        }
      }
    },
    [props.objectValue, props.multiple, props.onChange],
  );

  // ---- 通过 ID 自动解析 ----
  // ID 模式时 value 本身就是 dept_id / dept_id[]；对象模式时无需解析
  const resolvedDeptId = props.multiple !== true && props.objectValue !== true
    ? props.value || null
    : null;
  const resolvedDeptIds = props.multiple === true && props.objectValue !== true
    ? props.value ?? null
    : null;

  const singleResolveValue = !multiple ? (items[0] ?? null) : null;
  const singleResolveCallback = useCallback(
    (detail: DeptItem | null) => {
      emitChange(detail ? [detail] : []);
    },
    [emitChange],
  );
  useSingleDeptResolve(
    !multiple ? resolvedDeptId : null,
    singleResolveValue,
    singleResolveCallback,
  );

  const multiResolveCallback = useCallback(
    (details: DeptItem[]) => {
      emitChange(details);
    },
    [emitChange],
  );
  useMultiDeptResolve(
    multiple ? resolvedDeptIds : null,
    multiple ? items : [],
    multiResolveCallback,
  );

  // ---- 弹窗状态 ----
  const [modalOpen, setModalOpen] = useState(false);

  function handleModalConfirm(selected: DeptItem[]) {
    emitChange(selected);
    setModalOpen(false);
  }

  return (
    <>
      <Selector<DeptItem>
        getItemId={(department) => department?.dept_id || ''}
        getItemLabel={(department) => department?.name || ''}
        items={items}
        onItemsChange={emitChange}
        multiple={multiple}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={className}
        searchApi={searchDepts}
        dropdownEmptyText="未找到匹配部门"
        dropdownPlaceholderText="输入关键字搜索部门"
        renderChip={(department, onRemove, isReadOnly) => (
          <DeptChip
            key={department?.dept_id || ''}
            department={department}
            removable={!isReadOnly}
            onRemove={(dept, event) => onRemove(dept, event)}
          />
        )}
        renderReadOnlySingle={(department) => (
          <DeptLabel department={department} />
        )}
        renderDropdownItem={(department, { selected }) => (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="text-sm text-foreground truncate flex-1">
              {department?.name || ''}
            </span>
            {multiple ? (
              <Checkbox checked={selected} className="pointer-events-none" />
            ) : (
              <Check
                className={cn(
                  'h-4 w-4 shrink-0 text-primary',
                  selected ? 'opacity-100' : 'opacity-0',
                )}
              />
            )}
          </div>
        )}
        extraActions={
          <button
            type="button"
            className="flex items-center justify-center h-7 w-7 shrink-0 self-center text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              if (disabled) return;
              setModalOpen(true);
            }}
          >
            <TreeIcon />
          </button>
        }
      />

      {/* 部门树弹窗 */}
      <DeptTreeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialSelected={items}
        multiple={multiple}
        onConfirm={handleModalConfirm}
      />
    </>
  );
}

// ---- 图标 ----

/** 部门树图标，dept-selector 模块内共享。 */
export function TreeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 -3 20 20"
      fill="none"
      className={cn('block', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 2V7M10 7H5M10 7H15M5 7V11M15 7V11M5 11H3V14H7V11H5ZM15 11H13V14H17V11H15Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <rect x="8" y="1" width="4" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
