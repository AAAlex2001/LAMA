// Re-export shared types from @/types/post
export type {
  InlineButtonType,
  CallbackAction,
  InlineButton,
  ButtonRow,
  InlineKeyboardButton,
  InlineKeyboard,
  MediaFile,
  UploadedFile,
  QuizAnswer,
  QuizMode,
  PollData,
  ContentType,
  PublicationStatus,
  Draft,
  BotMessageCompact,
  DraftListResponse,
  TextTemplate,
  TextTemplateListResponse,
  CreateTextTemplateRequest,
  UpdateTextTemplateRequest,
  Post,
  PostListResponse,
  DraftsModalProps,
  TemplatesModalProps,
  ReplyToPostModalProps,
  DatePickerModalProps,
} from '@/types/post';

// Re-export shared types from @/types
export type { TagColor, Tag, TagsResponse, ChannelOption, ChannelsResponse, SyncChannelRequest, SyncChannelResponse } from '@/types';
import type { ChannelBasic } from '@/types';
export type Channel = ChannelBasic;

// Re-export shared types from @/types/post (needed locally)
import type { InlineKeyboard, PollData, MediaFile, ButtonRow, QuizAnswer, QuizMode, PublicationStatus } from '@/types/post';

// === Create-post specific types ===

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type RepeatCustomUnit = 'days' | 'weeks' | 'months' | 'years';
export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';

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
  selectedTags?: Array<{ name: string; color: string }>;
  sourcePublicationId?: number;
  seriesId?: number;
  seriesOrder?: number;
}

export interface CreatePostRequest {
  content_type: string;
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
  tag_colors?: string[];
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

export interface SettingsState {
  pinPost: boolean;
  notifySubscribers: boolean;
  autoDeleteInterval: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
  selectedTags: Array<{ id?: number; name: string; color: string }>;
  selectedTagColor: string | null;
  repeatInterval: RepeatOption;
  repeatPublishTimeType: 'from_publish' | 'exact_time';
  repeatPublishHours: number;
  repeatPublishMinutes: number;
  repeatCustomDays: number;
  repeatCustomHours: number;
  repeatCustomUnit: RepeatCustomUnit;
  repeatCustomValue: number;
  repeatWeekdays: number[];
  repeatMonthDays: number[];
  repeatYearMonth: number;
  repeatYearDays: number[];
  repeatEndType: 'never' | 'date';
  repeatEndDate: string | null;
  replyToPostId: number | null;
}
