import { useEffect } from 'react';
import type { DeptItem } from '@/types/department';
import { fetchDeptById } from './api';

// ============================================================
// useDeptResolve — 根据 dept_id 自动解析为 DeptItem 对象
//
// 与 useEmployeeResolve 对称，供 DeptDisplay / DeptListDisplay 使用。
// 内部维护模块级缓存，同一 deptId 不会重复请求。
// ============================================================

/** 模块级缓存：deptId → DeptItem */
const deptDetailCache = new Map<string, DeptItem>();

/** 清空部门详情缓存（测试或强制刷新时使用） */
export function clearDeptDetailCache() {
  deptDetailCache.clear();
}

async function resolveDept(deptId: string): Promise<DeptItem | null> {
  const cached = deptDetailCache.get(deptId);
  if (cached) return cached;
  try {
    const detail = await fetchDeptById(deptId);
    if (detail) deptDetailCache.set(deptId, detail);
    return detail;
  } catch {
    // 任何网络/解析异常都降级为 null，避免 unhandled promise rejection
    return null;
  }
}

/** 解析单个 dept_id 为 DeptItem */
export function useSingleDeptResolve(
  deptId: string | null | undefined,
  currentValue: DeptItem | null,
  onResolved: (detail: DeptItem | null) => void,
): void {
  useEffect(() => {
    if (!deptId || currentValue) return;

    let cancelled = false;
    resolveDept(deptId)
      .then((detail) => {
        if (!cancelled && detail) {
          onResolved(detail);
        }
      })
      .catch(() => {
        // 静默失败：保持空态，不影响页面渲染
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptId]);
}

/** 解析多个 dept_id 为 DeptItem[] */
export function useMultiDeptResolve(
  deptIds: string[] | null | undefined,
  currentValue: DeptItem[],
  onResolved: (details: DeptItem[]) => void,
): void {
  const joinedIds = deptIds?.join(',') || '';

  useEffect(() => {
    if (!deptIds || deptIds.length === 0 || currentValue.length > 0) return;

    let cancelled = false;
    Promise.all(deptIds.map(resolveDept))
      .then((resolvedList) => {
        if (cancelled) return;
        const details = resolvedList.filter((item): item is DeptItem => item !== null);
        if (details.length > 0) {
          onResolved(details);
        }
      })
      .catch(() => {
        // 静默失败：保持空态
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedIds]);
}

export { resolveDept };
