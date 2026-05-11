import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { TextTemplate, TextTemplateListResponse } from '@/types/post';
import { apiRequest } from '@/store/api';
import { queryClient as defaultQueryClient } from '@/store/query-client';

const PAGE_SIZE = 20;

export const textTemplatesKeys = {
  all: ['text-templates'] as const,
  list: (search: string) => [...textTemplatesKeys.all, 'list', search] as const,
};

function buildListUrl(skip: number, search: string): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(skip) });
  if (search) params.set('search', search);
  return `/publications/text-templates/?${params}`;
}

export function useTextTemplatesQuery(search = '') {
  return useInfiniteQuery({
    queryKey: textTemplatesKeys.list(search),
    queryFn: ({ pageParam }) =>
      apiRequest<TextTemplateListResponse>(buildListUrl(pageParam, search)),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.items.length >= PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    staleTime: 30 * 1000,
  });
}

export function useSaveTextTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (html: string): Promise<TextTemplate> => {
      const trimmed = html.trim();
      if (!trimmed) throw new Error('Текст шаблона пустой');
      const plain = trimmed.replace(/<[^>]*>/g, '').trim();
      const name = plain.length > 30 ? `${plain.slice(0, 30)}...` : plain;
      return apiRequest<TextTemplate>('/publications/text-templates/', {
        method: 'POST',
        body: JSON.stringify({ name, formatted_content: { text: trimmed } }),
      });
    },
    onSuccess: () => invalidateTextTemplates(qc),
  });
}

export function useUpdateTextTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: Partial<TextTemplate> }) =>
      apiRequest(`/publications/text-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    onSuccess: () => invalidateTextTemplates(qc),
  });
}

export function useDeleteTextTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/publications/text-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateTextTemplates(qc),
  });
}

export function invalidateTextTemplates(qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: textTemplatesKeys.all });
}
