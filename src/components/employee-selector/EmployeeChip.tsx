import type React from 'react';
import type { Employee } from '@/types/contacts';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EmployeeAvatar } from './EmployeeAvatar';
import { X } from 'lucide-react';

// ============================================================
// EmployeeChip / EmployeeLabel
//
// - EmployeeChip：多选场景下可移除的员工标签（Badge 背景 + 头像 + ×）
// - EmployeeLabel：单选场景下头像+姓名显示（无 Badge 背景、无 ×）
//
// Selector 只读单选 / Display 单选走 EmployeeLabel；Selector 多选 chip / Display 多选走 EmployeeChip。
// ============================================================

// ---- EmployeeChip（多选 / 可移除）----

export interface EmployeeChipProps {
  employee: Employee;
  /** 是否显示移除（×）按钮，默认 true */
  removable?: boolean;
  onRemove?: (employee: Employee, event: React.MouseEvent) => void;
  className?: string;
}

export function EmployeeChip({
  employee,
  removable = true,
  onRemove,
  className,
}: EmployeeChipProps) {
  const name = employee?.name || '';
  return (
    <Badge variant="secondary" className={cn('gap-1 py-0.5 pl-1 pr-1.5 font-normal', className)}>
      <EmployeeAvatar employee={employee} size={18} />
      <span className="text-sm">{name}</span>
      {removable && onRemove && (
        <button
          type="button"
          className="ml-0.5 rounded-full hover:bg-muted p-0.5 cursor-pointer"
          onClick={(event) => onRemove(employee, event)}
          aria-label={`移除 ${name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

// ---- EmployeeLabel（单选 / 头像+姓名）----

export interface EmployeeLabelProps {
  employee?: Employee;
  /** 头像像素尺寸，默认 24 */
  size?: number;
  className?: string;
}

export function EmployeeLabel({ employee, size = 24, className }: EmployeeLabelProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <EmployeeAvatar employee={employee} size={size} />
      <span className="text-sm truncate">{employee?.name || ''}</span>
    </span>
  );
}
