import type {
  DeptItem,
  GetDeptTreeResponse,
  SearchDeptsResponse,
  ApiResponse,
} from '@/types/department';
import { apiFetch } from '@/lib/api';
import type { SearchApiResult } from '@/components/selector';
import { DEFAULT_SEARCH_LIMIT } from './types';

// ============================================================
// DeptSelector — API 层
// 集中封装部门树与搜索相关的请求函数。
// ============================================================

/** 获取指定部门的直接子节点（懒加载树）。 */
export async function fetchDeptTree(deptId = '-1'): Promise<GetDeptTreeResponse> {
  const params = new URLSearchParams({ dept_id: deptId });
  const response = await apiFetch(`/api/depts/tree?${params}`);
  if (!response.ok) throw new Error(`getDeptTree failed: ${response.status}`);
  const json: ApiResponse<GetDeptTreeResponse> = await response.json();
  if (!json.success) throw new Error(json.error || 'getDeptTree failed');
  return json.data;
}

/** 根据关键字分页搜索部门，统一返回 { has_more, offset, total, items }。 */
export async function searchDepts(
  keyword: string,
  offset = 0,
  limit = DEFAULT_SEARCH_LIMIT,
): Promise<SearchApiResult<DeptItem>> {
  const params = new URLSearchParams({
    key: keyword,
    offset: String(offset),
    limit: String(limit),
  });
  const response = await apiFetch(`/api/depts/search?${params}`);
  if (!response.ok) throw new Error(`searchDepts failed: ${response.status}`);
  const json: ApiResponse<SearchDeptsResponse> = await response.json();
  if (!json.success) throw new Error(json.error || 'searchDepts failed');
  const data = json.data;
  const items = (data.items || []).map((item) => ({
    dept_id: item.dept_id,
    name: item.name,
  }));
  return {
    has_more: offset + items.length < data.total,
    offset: offset + items.length,
    total: data.total,
    items,
  };
}

/** 根据 dept_id 获取单个部门详情，请求失败时返回 null。 */
export async function fetchDeptById(deptId: string): Promise<DeptItem | null> {
  if (!deptId) return null;
  try {
    const response = await apiFetch(`/api/depts/${encodeURIComponent(deptId)}`);
    if (!response.ok) return null;
    const json: ApiResponse<DeptItem> = await response.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}
