// ============================================================
// Department API Types
// ============================================================

export interface DeptItem {
  dept_id: string;
  name: string;
  /** 是否存在下级部门（树接口返回） */
  has_children?: boolean;
  /** 完整部门路径（搜索 / 详情接口返回） */
  dept_full_path?: string;
}

/** getDeptTree API response */
export interface GetDeptTreeResponse {
  items: DeptItem[];
  total: number;
}

/** searchDepts API response */
export interface SearchDeptsResponse {
  items: DeptItem[];
  total: number;
}

/** Standard API response wrapper from backend */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
