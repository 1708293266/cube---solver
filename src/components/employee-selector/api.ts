import type { Employee, SearchResult, ApiResponse } from '@/types/contacts';
import { apiFetch } from '@/lib/api';
import { DEFAULT_PAGE_LIMIT } from './types';

// ============================================================
// EmployeeSelector — API 层
// 集中封装人员搜索与详情查询相关的请求函数。
// ============================================================

/** 根据 emp_id 获取单个员工，请求失败时返回 null。 */
export async function fetchEmployeeById(employeeId: string): Promise<Employee | null> {
  if (!employeeId) return null;
  try {
    const response = await apiFetch(`/api/contacts/employees/${encodeURIComponent(employeeId)}`);
    if (!response.ok) return null;
    const json: ApiResponse<Employee> = await response.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

/** 根据关键字分页搜索员工。 */
export async function searchEmployees(
  query: string,
  offset = 0,
  limit = DEFAULT_PAGE_LIMIT,
): Promise<SearchResult<Employee>> {
  const params = new URLSearchParams({
    query,
    offset: String(offset),
    limit: String(limit),
  });
  const response = await apiFetch(`/api/contacts/employees/search?${params}`);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Search failed: ${response.status} ${body}`);
  }
  const json: ApiResponse<SearchResult<Employee>> = await response.json();
  if (!json.success) throw new Error(json.error || 'Search failed');
  return json.data;
}
