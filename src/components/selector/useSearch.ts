import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================
// useSearch — 通用防抖搜索 Hook
//
// 面向 Selector 使用场景，将任意后端搜索接口统一到：
//   入参：(query, offset, limit)
//   出参：{ has_more, offset, total, items }
// 并提供标准的分页加载更多、loading/error 状态。
// ============================================================

/** 统一的搜索返回结构 */
export interface SearchApiResult<T> {
  has_more: boolean;
  offset: number;
  total: number;
  items: T[];
}

/** 统一的搜索接口签名 */
export type SearchApi<T> = (
  query: string,
  offset: number,
  limit: number,
) => Promise<SearchApiResult<T>>;

export interface UseSearchOptions<T> {
  /** 搜索接口 */
  searchApi: SearchApi<T>;
  /** 每页条数 */
  limit?: number;
  /** 输入防抖毫秒数 */
  debounceMs?: number;
}

export interface UseSearchReturn<T> {
  results: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
}

export const DEFAULT_SEARCH_LIMIT = 20;
export const DEFAULT_SEARCH_DEBOUNCE_MS = 300;

export function useSearch<T>(
  query: string,
  options: UseSearchOptions<T>,
): UseSearchReturn<T> {
  const {
    searchApi,
    limit = DEFAULT_SEARCH_LIMIT,
    debounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
  } = options;

  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const offsetRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // 让 searchApi 变化不会触发重新搜索
  const searchApiRef = useRef(searchApi);
  useEffect(() => {
    searchApiRef.current = searchApi;
  }, [searchApi]);

  const executeSearch = useCallback(
    async (searchQuery: string, append: boolean) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasMore(false);
        setTotal(0);
        setError(null);
        offsetRef.current = 0;
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const currentOffset = append ? offsetRef.current : 0;
        const data = await searchApiRef.current(searchQuery, currentOffset, limit);
        const items = Array.isArray(data?.items) ? data.items.filter(Boolean) : [];
        // 兼容后端可能不返回 offset 的情况
        offsetRef.current =
          typeof data?.offset === 'number' ? data.offset : currentOffset + items.length;
        setHasMore(Boolean(data?.has_more));
        setTotal(typeof data?.total === 'number' ? data.total : items.length);
        setResults((previous) => (append ? [...previous, ...items] : items));
      } catch (searchError: unknown) {
        const message = searchError instanceof Error ? searchError.message : '搜索失败';
        setError(message);
        if (!append) setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  // query 变化时防抖重置
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      offsetRef.current = 0;
      executeSearch(query, false);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, executeSearch, debounceMs]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      executeSearch(query, true);
    }
  }, [hasMore, loading, query, executeSearch]);

  return { results, loading, error, hasMore, total, loadMore };
}
