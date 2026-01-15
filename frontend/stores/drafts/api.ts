import type { Draft, DraftListResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const ENDPOINTS = {
  drafts: `${API_BASE_URL}/publications/drafts`,
  publications: `${API_BASE_URL}/publications`,
} as const;

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
  };

  const response = await fetch(endpoint, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const draftsApi = {
  async getDrafts(page = 1, pageSize = 50): Promise<DraftListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    
    return fetchApi<DraftListResponse>(
      `${ENDPOINTS.drafts}?${params}`
    );
  },

  async getDraft(id: number): Promise<Draft> {
    return fetchApi<Draft>(`${ENDPOINTS.publications}/${id}`);
  },

  async deleteDraft(id: number): Promise<void> {
    await fetchApi<void>(`${ENDPOINTS.publications}/${id}`, {
      method: 'DELETE',
    });
  },
};
