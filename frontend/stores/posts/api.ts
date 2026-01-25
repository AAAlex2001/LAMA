import type { Post, PostListResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const ENDPOINTS = {
  posts: `${API_BASE_URL}/publications`,
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

export const postsApi = {
  async getPosts(page = 1, pageSize = 50, status = 'published', channelId?: number): Promise<PostListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    params.append('status', status);
    if (channelId) {
      params.append('channel_id', channelId.toString());
    }
    
    return fetchApi<PostListResponse>(
      `${ENDPOINTS.posts}?${params}`
    );
  },

  async getPost(id: number): Promise<Post> {
    return fetchApi<Post>(`${ENDPOINTS.posts}/${id}`);
  },
};
