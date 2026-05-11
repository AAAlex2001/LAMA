import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { Tag, TagsResponse } from '@/types';
import { apiRequest } from '@/store/api';
import { queryClient as defaultQueryClient } from '@/store/query-client';

export const tagsQueryKey = ['tags'] as const;
export const tagsSearchQueryKey = (query: string) => ['tags', 'search', query] as const;

const DEFAULT_PAGE_SIZE = 100;

async function fetchTags(pageSize = DEFAULT_PAGE_SIZE): Promise<Tag[]> {
  const params = new URLSearchParams({ page: '1', page_size: String(pageSize) });
  const response = await apiRequest<TagsResponse>(`/publications/tags/?${params}`, { method: 'GET' });
  return response.items || [];
}

export function useTagsQuery(pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: tagsQueryKey,
    queryFn: () => fetchTags(pageSize),
    staleTime: 5 * 60 * 1000,
  });
}

async function searchTags(query: string): Promise<Tag[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const params = new URLSearchParams({ q: trimmed, limit: '10' });
  const response = await apiRequest<TagsResponse>(`/publications/tags/search?${params}`, { method: 'GET' });
  return response.items || [];
}

export function useSearchTagsQuery(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: tagsSearchQueryKey(trimmed),
    queryFn: () => searchTags(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 30 * 1000,
  });
}

export interface CreateTagParams {
  name: string;
  color?: string | null;
}

export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color }: CreateTagParams): Promise<Tag> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Имя тега не может быть пустым');
      return apiRequest<Tag>('/publications/tags/', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed, color: color || null }),
      });
    },
    onSuccess: () => invalidateTags(queryClient),
  });
}

export interface UpdateTagParams {
  id: number;
  name?: string;
  color?: string;
}

export function useUpdateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, color }: UpdateTagParams): Promise<Tag> => {
      const body: Record<string, string> = {};
      if (name !== undefined) body.name = name.trim();
      if (color !== undefined) body.color = color;
      return apiRequest<Tag>(`/publications/tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => invalidateTags(queryClient),
  });
}

export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: number): Promise<number> => {
      await apiRequest(`/publications/tags/${tagId}`, { method: 'DELETE' });
      return tagId;
    },
    onSuccess: () => invalidateTags(queryClient),
  });
}

export function invalidateTags(qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: tagsQueryKey });
}
