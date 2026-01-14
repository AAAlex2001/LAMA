import type { Tag, TagListResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const ENDPOINTS = {
  tags: `${API_BASE_URL}/publications/tags`,
  search: `${API_BASE_URL}/publications/tags/search`,
} as const;

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('lamaplanner_access_token') 
    : null;
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(endpoint, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || 'Ошибка сервера',
        response.status,
        errorData
      );
    }

    // Для DELETE возвращаем null
    if (response.status === 204) {
      return null as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Ошибка сети или сервера недоступен');
  }
}

/**
 * Получить список тегов (недавние/популярные)
 */
export async function fetchTags(
  page: number = 1,
  pageSize: number = 20
): Promise<TagListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  
  return fetchApi<TagListResponse>(`${ENDPOINTS.tags}/?${params}`);
}

/**
 * Поиск тегов по имени
 */
export async function searchTags(
  query: string,
  limit: number = 10
): Promise<TagListResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  
  return fetchApi<TagListResponse>(`${ENDPOINTS.search}?${params}`);
}

/**
 * Создать новый тег
 */
export async function createTag(name: string): Promise<Tag> {
  return fetchApi<Tag>(`${ENDPOINTS.tags}/`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Удалить тег
 */
export async function deleteTag(tagId: number): Promise<void> {
  await fetchApi<void>(`${ENDPOINTS.tags}/${tagId}`, {
    method: 'DELETE',
  });
}
