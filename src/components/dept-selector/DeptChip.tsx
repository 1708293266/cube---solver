import type React from 'react';
import type { DeptItem } from '@/types/department';
import { cn } from '@/lib/utils';

// ============================================================
// DeptChip / DeptLabel
//
// - DeptChip：多选场景下可移除的部门标签（badge 背景 + ×）
// - DeptLabel：单选场景下纯文本显示（只显示 name，无 chip 背景、无 ×）
//
// Selector 只读 / Display 单选走 DeptLabel；Selector 多选 chip / Display 多选走 DeptChip。
// ============================================================

// ---- DeptChip（多选 / 可移除）----

export interface DeptChipProps {
  department: DeptItem;
  removable?: boolean;
  onRemove?: (department: DeptItem, event: React.MouseEvent) => void;
  className?: string;
}

export function DeptChip({
  department,
  removable = true,
  onRemove,
  className,
}: DeptChipProps) {
  const name = department?.name || '';
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-sm', className)}
    >
      {name}
      {removable && onRemove && (
        <button
          type="button"
          className="ml-0.5 text-primary/60 hover:text-primary leading-none"
          onClick={(event) => onRemove(department, event)}
          aria-label={`移除 ${name}`}
        >
          &times;
        </button>
      )}
    </span>
  );
}

// ---- DeptLabel（单选 / 纯文本）----

export interface DeptLabelProps {
  department?: DeptItem;
  /** 是否显示完整部门路径（`dept_full_path`），默认 false。
   *  当接口未返回 `dept_full_path` 时自动回落到 `name`。 */
  showFullPath?: boolean;
  className?: string;
}

export function DeptLabel({ department, showFullPath = false, className }: DeptLabelProps) {
  const text = showFullPath ? (department?.dept_full_path || department?.name || '') : department?.name || '';
  return (
    <span className={cn('text-sm text-foreground truncate', className)}>
      {text}
    </span>
  );
}
