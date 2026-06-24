import { useState, useCallback } from 'react';
import type { DeptItem } from '@/types/department';
import { fetchDeptTree } from './api';

// ============================================================
// useDeptTree — 懒加载的部门树导航 Hook
//
// 维护面包屑栈与当前层级的子节点列表。
// 内部维护一份模块级的 tree 缓存，同一 deptId 不会重复请求。
// ============================================================

/** 模块级缓存：deptId → 已加载的子节点列表 */
const deptTreeCache = new Map<string, DeptItem[]>();

/** 清空模块级 tree 缓存（测试或强制刷新时使用） */
export function clearDeptTreeCache() {
  deptTreeCache.clear();
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface UseDeptTreeReturn {
  /** 当前层级的子节点列表 */
  currentNodes: DeptItem[];
  /** 从根到当前层级的面包屑路径 */
  breadcrumbStack: BreadcrumbItem[];
  /** 树数据是否正在加载 */
  loading: boolean;
  /** 加载（或重新加载）指定部门的子节点，传 '-1' 表示根 */
  loadChildren: (deptId?: string) => Promise<void>;
  /** 进入指定子部门 */
  navigateInto: (node: DeptItem) => void;
  /** 退回到指定面包屑层级（-1 表示根） */
  navigateBack: (index: number) => void;
  /** 重置树到根层级 */
  resetTree: () => void;
}

export function useDeptTree(): UseDeptTreeReturn {
  const [currentNodes, setCurrentNodes] = useState<DeptItem[]>([]);
  const [breadcrumbStack, setBreadcrumbStack] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChildren = useCallback(async (deptId = '-1') => {
    // 命中缓存直接复用，不走网络请求
    const cached = deptTreeCache.get(deptId);
    if (cached) {
      setCurrentNodes(cached);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchDeptTree(deptId);
      const nodes = data.items || [];
      deptTreeCache.set(deptId, nodes);
      setCurrentNodes(nodes);
    } catch {
      setCurrentNodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const navigateInto = useCallback(
    (node: DeptItem) => {
      setBreadcrumbStack((previous) => [...previous, { id: node.dept_id, name: node.name }]);
      loadChildren(node.dept_id);
    },
    [loadChildren],
  );

  const navigateBack = useCallback(
    (index: number) => {
      if (index < 0) {
        setBreadcrumbStack([]);
        loadChildren('-1');
      } else {
        const target = breadcrumbStack[index];
        setBreadcrumbStack((previous) => previous.slice(0, index + 1));
        loadChildren(target.id);
      }
    },
    [breadcrumbStack, loadChildren],
  );

  const resetTree = useCallback(() => {
    setBreadcrumbStack([]);
    setCurrentNodes([]);
  }, []);

  return {
    currentNodes,
    breadcrumbStack,
    loading,
    loadChildren,
    navigateInto,
    navigateBack,
    resetTree,
  };
}
