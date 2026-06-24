import { useState, useEffect } from 'react';
import type { Employee } from '@/types/contacts';
import { cn } from '@/lib/utils';
import { EmployeeChip, EmployeeLabel } from './EmployeeChip';
import { resolveEmployee } from './useEmployeeResolve';

// ============================================================
// EmployeeDisplay / EmployeeListDisplay — 纯展示组件
//
// 根据 empId / empIds 自动 fetch 并展示人员信息。
// 适用于表格列、详情页、卡片等只读场景。
//
// 单选复用 EmployeeLabel（头像+姓名）；多选复用 EmployeeChip（removable=false）。
// resolveEmployee 与模块级缓存由 useEmployeeResolve 统一提供。
// ============================================================

// ---- EmployeeDisplay（单人展示）----

export interface EmployeeDisplayProps {
  empId: string | null | undefined;
  /** 头像像素尺寸，默认 24 */
  size?: number;
  className?: string;
}

export function EmployeeDisplay({ empId, size = 24, className }: EmployeeDisplayProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (!empId) { setEmployee(null); return; }
    let cancelled = false;
    resolveEmployee(empId)
      .then((result) => {
        if (!cancelled) setEmployee(result);
      })
      .catch(() => {
        if (!cancelled) setEmployee(null);
      });
    return () => { cancelled = true; };
  }, [empId]);

  if (!empId || !employee) return <span className={cn('text-sm text-muted-foreground', className)}>-</span>;

  return <EmployeeLabel employee={employee} size={size} className={className} />;
}

// ---- EmployeeListDisplay（多人展示）----

export interface EmployeeListDisplayProps {
  empIds: string[] | null | undefined;
  /** 最多展示数量，超出显示 +N，默认 5 */
  maxDisplay?: number;
  className?: string;
}

export function EmployeeListDisplay({
  empIds,
  maxDisplay = 5,
  className,
}: EmployeeListDisplayProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const joinedIds = empIds?.join(',') || '';

  useEffect(() => {
    if (!empIds || empIds.length === 0) { setEmployees([]); return; }
    let cancelled = false;
    Promise.all(empIds.map(resolveEmployee))
      .then((results) => {
        if (cancelled) return;
        setEmployees(results.filter((item): item is Employee => item !== null));
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedIds]);

  if (!empIds || empIds.length === 0) {
    return <span className={cn('text-sm text-muted-foreground', className)}>-</span>;
  }

  const visible = employees.slice(0, maxDisplay);
  const overflowCount = employees.length - maxDisplay;

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {visible.map((employee) => (
        <EmployeeChip
          key={employee?.emp_id || ''}
          employee={employee}
          removable={false}
        />
      ))}
      {overflowCount > 0 && (
        <span className="text-xs text-muted-foreground">+{overflowCount}</span>
      )}
    </span>
  );
}
