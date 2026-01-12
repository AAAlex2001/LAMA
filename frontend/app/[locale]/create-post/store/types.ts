// Типы для создания и публикации постов

export type ContentType = 'text' | 'text_with_media' | 'image' | 'video' | 'audio' | 'document' | 'link' | 'poll' | 'quiz';
export type PublicationStatus = 'draft' | 'scheduled' | 'published' | 'partial_success' | 'failed' | 'deleted';
export type RepeatInterval = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type AutoDeleteInterval = 'never' | '24h' | '48h' | '72h' | 'custom';

export interface InlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface InlineKeyboard {
  buttons: InlineButton[][];
}

export interface PollData {
  question: string;
  options: string[];
  is_anonymous?: boolean;
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
  explanation?: string;
  is_quiz?: boolean;
}

export interface CreatePostRequest {
  content_type: ContentType;
  text_content?: string;
  formatted_content?: Record<string, any>;
  media_urls?: string[];
  media_blur?: boolean[];  // Array of booleans, one per media file
  inline_keyboard?: InlineKeyboard;
  poll_data?: PollData;
  pin_message?: boolean;
  disable_notification?: boolean;
  auto_delete_hours?: number;
  auto_delete_delay_seconds?: number;
  scheduled_time?: string; // ISO date string
  timezone?: string;
  series_id?: number;
  series_order?: number;
  ai_prompt?: string;
  channel_ids: number[];
  tag_names?: string[];
  tag_color?: string;
  status?: PublicationStatus;
  repeat_interval?: RepeatInterval;
  repeat_custom_days?: number;
  repeat_custom_hours?: number;
  auto_delete_interval?: AutoDeleteInterval;
  auto_delete_custom_hours?: number;
}

export interface CreatePostResponse {
  success: boolean;
  postId?: number;
  message?: string;
  errors?: string[];
  id?: number; // API возвращает id вместо postId
}

export interface PublishPostResponse {
  id: number;
  status: PublicationStatus;
  content_type: ContentType;
  text_content?: string;
  formatted_content?: Record<string, any>;
  media_urls?: string[];
  media_blur?: boolean;
  inline_keyboard?: Record<string, any>;
  poll_data?: Record<string, any>;
  pin_message?: boolean;
  auto_delete_hours?: number;
  auto_delete_delay_seconds?: number;
  scheduled_time?: string;
  timezone?: string;
  series_id?: number;
  series_order?: number;
  ai_generated?: boolean;
  ai_prompt?: string;
  published_time?: string;
  repeat_interval?: RepeatInterval;
  repeat_custom_days?: number;
  repeat_custom_hours?: number;
  next_repeat_time?: string;
  created_at: string;
  updated_at: string;
  channels: Array<{
    id: number;
    telegram_id: number;
    title: string;
    username?: string;
    is_active: boolean;
  }>;
  tags: Array<{
    id: number;
    name: string;
    color?: string;
  }>;
  series?: {
    id: number;
    name: string;
    description?: string;
    reply_to_previous: boolean;
    created_at: string;
  };
}
