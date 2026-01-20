import type {
  TextTemplate,
  TextTemplateListResponse,
  CreateTextTemplateRequest,
  UpdateTextTemplateRequest,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const ENDPOINTS = {
  templates: `${API_BASE_URL}/publications/text-templates`,
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

export const templatesApi = {
  async getTemplates(page = 1, pageSize = 20, search?: string): Promise<TextTemplateListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    if (search) params.append('search', search);
    
    return fetchApi<TextTemplateListResponse>(
      `${ENDPOINTS.templates}/?${params}`
    );
  },

  async createTemplate(data: CreateTextTemplateRequest): Promise<TextTemplate> {
    return fetchApi<TextTemplate>(ENDPOINTS.templates + '/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTemplate(id: number): Promise<TextTemplate> {
    return fetchApi<TextTemplate>(`${ENDPOINTS.templates}/${id}`);
  },

  async updateTemplate(
    id: number,
    data: UpdateTextTemplateRequest
  ): Promise<TextTemplate> {
    return fetchApi<TextTemplate>(`${ENDPOINTS.templates}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteTemplate(id: number): Promise<void> {
    await fetchApi<void>(`${ENDPOINTS.templates}/${id}`, {
      method: 'DELETE',
    });
  },
};
