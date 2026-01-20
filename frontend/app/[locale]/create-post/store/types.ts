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
  correct_option_id?: number | null;
  explanation?: string | null;
  is_quiz?: boolean;
}

export type ContentType = 'text' | 'text_with_media' | 'poll' | 'quiz';
export type PublicationStatus = 'draft' | 'scheduled' | 'published';

export interface CreatePostRequest {
  content_type: ContentType;
  text_content?: string;
  formatted_content?: Record<string, any>;
  media_urls?: string[];
  media_thumbnail_urls?: Array<string | null>;
  media_file_ids?: string[];
  media_blur?: boolean[];
  channel_ids: number[];
  pin_message?: boolean;
  disable_notification?: boolean;
  disable_web_page_preview?: boolean;
  status?: PublicationStatus;
  inline_keyboard?: InlineKeyboard;
  poll_data?: PollData;
  tag_names?: string[];
  tag_color?: string;
  repeat_interval?: string;
  repeat_custom_days?: number;
  repeat_custom_hours?: number;
  series_id?: number;
  series_order?: number;
  auto_delete_delay_seconds?: number;
  reply_to_post_id?: number;
}

export interface CreatePostResponse {
  id: number;
  status: string;
  message?: string;
}

export interface PublishPostResponse {
  success: boolean;
  message: string;
  publication_id?: number;
}
