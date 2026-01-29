@ -1,310 +0,0 @@
export type InlineButtonType = 'url' | 'callback' | 'hidden_text';

export interface InlineButton {
  id: string;
  text: string;
  type: InlineButtonType;
  url?: string;
  callback_data?: string;
  hidden_text?: string;
}

export interface ButtonRow {
  id: string;
  buttons: InlineButton[];
}

export interface InlineKeyboardButton {
  text: string;
  type: InlineButtonType;
  url?: string;
  callback_data?: string;
  hidden_text?: string;
}

export interface InlineKeyboard {
  buttons: InlineKeyboardButton[][];
}

export interface MediaFile {
  id: string;
  url?: string;
  preview_url?: string;
  thumbnail_url?: string | null;
  type: 'image' | 'video' | 'document';
  blur?: boolean;
  file?: File;
  telegram_file_id?: string | null;
  size?: number;
}

export interface QuizAnswer {
  id: string;
  text: string;
}

export type QuizMode = 'poll_single' | 'poll_multi' | 'quiz';

export interface PollData {
  question: string;
  options: string[];
  is_anonymous?: boolean;
  allows_multiple_answers?: boolean;
  correct_option_id?: number | null;
  explanation?: string | null;
  is_quiz?: boolean;
}

export type TagColor = '#FAC7C7' | '#FDE57E' | '#B8F1D2' | '#B8DBF1' | '#B8B9F1';

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type RepeatCustomUnit = 'days' | 'weeks' | 'months' | 'years';
export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';

export interface ChannelOption {
  id: string;
  label: string;
  checked?: boolean;
  members_count?: number;
  photo_url?: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  created_at: string;
}

export interface PostSnapshot {
  text: string;
  mediaFiles: MediaFile[];
  inlineButtonsOpen: boolean;
  buttonRows: ButtonRow[];
  quizOpen: boolean;
  quizMode: QuizMode;
  quizQuestion: string;
  quizAnswers: QuizAnswer[];
  quizCorrectAnswerId: string | null;
  showLinkPreview: boolean;
}

export type ContentType = 'text' | 'text_with_media' | 'poll' | 'quiz';
export type PublicationStatus = 'draft' | 'scheduled' | 'published';

export interface CreatePostRequest {
  content_type: ContentType;
  text_content?: string;
  formatted_content?: Record<string, any>;
  media_urls?: string[];
  media_thumbnail_urls?: Array<string | null>;
  media_file_ids?: Array<string | null>;
  media_blur?: boolean[];
  channel_ids: number[];
  pin_message?: boolean;
  disable_notification?: boolean;
  disable_web_page_preview?: boolean;
  status?: PublicationStatus;
  scheduled_time?: string;
  inline_keyboard?: InlineKeyboard;
  poll_data?: PollData;
  tag_names?: string[];
  tag_color?: string;
  repeat_interval?: string;
  repeat_custom_days?: number;
  repeat_custom_hours?: number;
  repeat_custom_unit?: RepeatCustomUnit;
  repeat_custom_value?: number;
  repeat_weekdays?: number[];
  repeat_month_days?: number[];
  repeat_year_month?: number;
  repeat_year_days?: number[];
  repeat_end_time?: string;
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

export interface SeriesResponse {
  id: number;
  name: string;
}

export interface PublicationResponse {
  id: number;
  status: string;
}

export interface ChannelsResponse {
  items?: Channel[];
}

export interface Channel {
  id: number;
  title: string;
  selected?: boolean;
  members_count?: number;
  photo_url?: string;
}

export interface TagsResponse {
  items?: Tag[];
}

export interface UploadedFile {
  url: string;
  file_id?: string;
  thumbnailUrl?: string;
}

export interface SettingsState {
  pinPost: boolean;
  notifySubscribers: boolean;
  autoDeleteInterval: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
  selectedTagName: string | null;
  selectedTagColor: string | null;
  repeatInterval: RepeatOption;
  replyToPostId: number | null;
}


export interface Draft {
  id: number;
  content_type: ContentType;
  status: string;
  text_content?: string;
  formatted_content?: Record<string, any>;
  media_urls?: string[];
  media_thumbnail_urls?: Array<string | null>;
  media_file_ids?: Array<string | null>;
  media_blur?: boolean[];
  inline_keyboard?: Record<string, any>;
  poll_data?: PollData;
  created_at: string;
  updated_at: string;
  channels: Channel[];
  tags: Tag[];
}

export interface DraftListResponse {
  items: Draft[];
  page: number;
  page_size: number;
}

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

export interface Post {
  id: number;
  content_type: ContentType;
  status: string;
  text_content?: string;
  formatted_content?: Record<string, any>;
  media_urls?: string[];
  media_thumbnail_urls?: Array<string | null>;
  media_file_ids?: Array<string | null>;
  media_blur?: boolean[];
  inline_keyboard?: Record<string, any>;
  poll_data?: PollData;
  reply_to_post_id?: number;
  created_at: string;
  updated_at: string;
  channels: Channel[];
  tags: Tag[];
}

export interface PostListResponse {
  items: Post[];
  page: number;
  page_size: number;
}

// ===== Dumb Component Props =====

export interface DraftsModalProps {
  isOpen: boolean;
  drafts: Draft[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  searchQuery: string;
  selectedDraftId: number | null;
  onSearchQueryChange: (query: string) => void;
  onLoadMore: () => void;
  onDelete: (id: number) => void;
  onSelect: (draft: Draft) => void;
  onClose: () => void;
}

export interface TemplatesModalProps {
  isOpen: boolean;
  templates: TextTemplate[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  searchQuery: string;
  selectedTemplateId: number | null;
  onSearchQueryChange: (query: string) => void;
  onLoadMore: () => void;
  onUpdate: (id: number, data: UpdateTextTemplateRequest) => void;
  onDelete: (id: number) => void;
  onSelect: (template: TextTemplate) => void;
  onClose: () => void;
}

export interface ReplyToPostModalProps {
  isOpen: boolean;
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  searchQuery: string;
  selectedPostId: number | null;
  channelTitle?: string;
  onSearchQueryChange: (query: string) => void;
  onLoadMore: () => void;
  onSelect: (post: Post) => void;
  onClose: () => void;
}

export interface DatePickerModalProps {
  isOpen: boolean;
  selectedDate: Date | null;
  hours: number;
  minutes: number;
  onDateChange: (date: Date) => void;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
  onSchedule: (scheduledDate: Date) => void | Promise<void>;
  onClose: () => void;
}