import { useEffect } from 'react';
import type { Employee } from '@/types/contacts';
import { fetchEmployeeById } from './api';

// ============================================================
// useEmployeeResolve — 根据 emp_id 自动解析为 Employee 对象
//
// 与 useDeptResolve 对称，供 EmployeeSelector / EmployeeDisplay / EmployeeListDisplay 使用。
// 内部维护模块级缓存，同一 empId 不会重复请求。
// ============================================================

/** 模块级缓存：empId → Employee（避免表格多行重复请求） */
const employeeDetailCache = new Map<string, Employee>();

/** 清空人员详情缓存（测试或强制刷新时使用） */
export function clearEmployeeDetailCache() {
  employeeDetailCache.clear();
}

async function resolveEmployee(empId: string): Promise<Employee | null> {
  const cached = employeeDetailCache.get(empId);
  if (cached) return cached;
  try {
    const employee = await fetchEmployeeById(empId);
    if (employee) employeeDetailCache.set(empId, employee);
    return employee;
  } catch {
    // 任何网络/解析异常都降级为 null，避免 unhandled promise rejection
    return null;
  }
}

/** 解析单个 emp_id 为 Employee */
export function useSingleEmployeeResolve(
  empId: string | null | undefined,
  currentValue: Employee | null,
  onResolved: (employee: Employee | null) => void,
): void {
  useEffect(() => {
    if (!empId || currentValue) return;

    let cancelled = false;
    resolveEmployee(empId)
      .then((employee) => {
        if (!cancelled && employee) {
          onResolved(employee);
        }
      })
      .catch(() => {
        // 静默失败：保持空态，不影响页面渲染
      });
    return () => { cancelled = true; };
    // 仅在 empId 变化时重新执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId]);
}

/** 解析多个 emp_id 为 Employee[] */
export function useMultiEmployeeResolve(
  empIds: string[] | null | undefined,
  currentValue: Employee[],
  onResolved: (employees: Employee[]) => void,
): void {
  const joinedIds = empIds?.join(',') || '';

  useEffect(() => {
    if (!empIds || empIds.length === 0 || currentValue.length > 0) return;

    let cancelled = false;
    Promise.all(empIds.map(resolveEmployee))
      .then((resolvedList) => {
        if (cancelled) return;
        const employees = resolvedList.filter((item): item is Employee => item !== null);
        if (employees.length > 0) {
          onResolved(employees);
        }
      })
      .catch(() => {
        // 静默失败：保持空态
      });
    return () => { cancelled = true; };
    // 仅在拼接后的 id 字符串变化时重新执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedIds]);
}

export { resolveEmployee };
