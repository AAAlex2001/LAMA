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

export interface UpdateTextTemplateRequest {
  name?: string;
  formatted_content?: Record<string, any>;
}
