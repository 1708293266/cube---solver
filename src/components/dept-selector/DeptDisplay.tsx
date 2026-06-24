import { useState, useEffect } from 'react';
import type { DeptItem } from '@/types/department';
import { cn } from '@/lib/utils';
import { DeptChip, DeptLabel } from './DeptChip';
import { resolveDept } from './useDeptResolve';

// ============================================================
// DeptDisplay / DeptListDisplay — 纯展示组件
//
// 根据 deptId / deptIds 自动 fetch 并展示部门信息。
// 适用于表格列、详情页、卡片等只读场景。
//
// 单选复用 DeptLabel（纯文本）；多选复用 DeptChip（removable=false）。
// ============================================================

// ---- DeptDisplay（单部门展示）----

export interface DeptDisplayProps {
  deptId: string | null | undefined;
  /** 是否显示完整部门路径（如“WuKong-W4-AI应用”），默认 false（只显示 name）。
   *  当接口未返回 dept_full_path 时自动回落到 name。 */
  showFullPath?: boolean;
  className?: string;
}

export function DeptDisplay({ deptId, showFullPath = false, className }: DeptDisplayProps) {
  const [detail, setDetail] = useState<DeptItem | null>(null);

  useEffect(() => {
    if (!deptId) { setDetail(null); return; }
    let cancelled = false;
    resolveDept(deptId)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => { cancelled = true; };
  }, [deptId]);

  if (!deptId || !detail) return <span className={cn('text-sm text-muted-foreground', className)}>-</span>;

  return <DeptLabel department={detail} showFullPath={showFullPath} className={className} />;
}

// ---- DeptListDisplay（多部门展示）----

export interface DeptListDisplayProps {
  deptIds: string[] | null | undefined;
  /** 是否显示完整部门路径，默认 false */
  showFullPath?: boolean;
  /** 最多展示数量，超出显示 +N，默认 5 */
  maxDisplay?: number;
  className?: string;
}

export function DeptListDisplay({
  deptIds,
  showFullPath = false,
  maxDisplay = 5,
  className,
}: DeptListDisplayProps) {
  const [details, setDetails] = useState<DeptItem[]>([]);

  const joinedIds = deptIds?.join(',') || '';

  useEffect(() => {
    if (!deptIds || deptIds.length === 0) { setDetails([]); return; }
    let cancelled = false;
    Promise.all(deptIds.map(resolveDept))
      .then((results) => {
        if (cancelled) return;
        setDetails(results.filter((item): item is DeptItem => item !== null));
      })
      .catch(() => {
        if (!cancelled) setDetails([]);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedIds]);

  if (!deptIds || deptIds.length === 0) {
    return <span className={cn('text-sm text-muted-foreground', className)}>-</span>;
  }

  const visible = details.slice(0, maxDisplay);
  const overflowCount = details.length - maxDisplay;

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {visible.map((detail) => (
        <DeptChip
          key={detail?.dept_id || ''}
          department={{
            dept_id: detail.dept_id,
            name: showFullPath ? (detail.dept_full_path || detail.name) : detail.name,
          }}
          removable={false}
        />
      ))}
      {overflowCount > 0 && (
        <span className="text-xs text-muted-foreground">+{overflowCount}</span>
      )}
    </span>
  );
}
