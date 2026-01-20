export interface Post {
  id: number;
  content_type: 'text' | 'text_with_media' | 'poll' | 'quiz';
  status: string;
  text_content?: string;
  formatted_content?: Record<string, any>;
  media_urls?: string[];
  media_thumbnail_urls?: Array<string | null>;
  media_file_ids?: Array<string | null>;
  media_blur?: boolean[];
  inline_keyboard?: Record<string, any>;
  poll_data?: {
    question: string;
    options: string[];
    is_anonymous?: boolean;
    allows_multiple_answers?: boolean;
    correct_option_id?: number | null;
    explanation?: string | null;
    is_quiz?: boolean;
  };
  reply_to_post_id?: number;
  created_at: string;
  updated_at: string;
  channels: any[];
  tags: any[];
}

export interface PostListResponse {
  items: Post[];
  page: number;
  page_size: number;
}
