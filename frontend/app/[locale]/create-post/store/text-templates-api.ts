const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export interface TextTemplate {
  id: number;
  owner_id: number;
  name: string;
  formatted_content: Record<string, any>;
  created_at: string;
}

export interface TextTemplateListResponse {
  items: TextTemplate[];
  total: number;
}

export interface CreateTextTemplateRequest {
  name: string;
  formatted_content: Record<string, any>;
}

export const textTemplatesApi = {
  async getTemplates(search?: string): Promise<TextTemplateListResponse> {
    const token = localStorage.getItem('lamaplanner_access_token');
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    const response = await fetch(`${API_BASE}/text-templates?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    
    return response.json();
  },

  async createTemplate(data: CreateTextTemplateRequest): Promise<TextTemplate> {
    const token = localStorage.getItem('lamaplanner_access_token');
    
    const response = await fetch(`${API_BASE}/text-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create template');
    }
    
    return response.json();
  },

  async deleteTemplate(id: number): Promise<void> {
    const token = localStorage.getItem('lamaplanner_access_token');
    
    const response = await fetch(`${API_BASE}/text-templates/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete template');
    }
  },
};
