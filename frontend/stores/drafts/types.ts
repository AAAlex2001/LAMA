export interface Draft {
  id: number;
  content_type: 'text' | 'text_with_media';
  status: string;
  text_content?: string;
  formatted_content?: Record<string, any>;
  media_urls?: string[];
  media_thumbnail_urls?: Array<string | null>;
  media_file_ids?: Array<string | null>;
  media_blur?: boolean[];
  inline_keyboard?: Record<string, any>;
  created_at: string;
  updated_at: string;
  channels: any[];
  tags: any[];
}

export interface DraftListResponse {
  items: Draft[];
  page: number;
  page_size: number;
}
