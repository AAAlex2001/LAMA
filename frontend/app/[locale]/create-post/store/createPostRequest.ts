import type { ContentType, CreatePostRequest, InlineKeyboard, PollData, PublicationStatus } from './types';
import type { PostSettingsFromUI } from './uiTypes';

export function buildBaseCreatePostRequest(options: {
  contentType: ContentType;
  text: string;
  hasText: boolean;
  formattedContent?: Record<string, any>;
  mediaUrls: string[];
  mediaThumbnailUrls?: Array<string | null>;
  mediaFileIds?: string[];
  mediaBlurArray?: boolean[];
  inlineKeyboard?: InlineKeyboard;
  pollData?: PollData | null;
  showLinkPreview?: boolean;
  status?: PublicationStatus;
  settings: PostSettingsFromUI;
}): CreatePostRequest {
  const {
    contentType,
    text,
    hasText,
    formattedContent,
    mediaUrls,
    mediaThumbnailUrls,
    mediaFileIds,
    mediaBlurArray,
    inlineKeyboard,
    pollData,
    showLinkPreview,
    status,
    settings,
  } = options;

  return {
    content_type: contentType,
    text_content: hasText ? text : undefined,
    formatted_content: formattedContent,
    media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
    media_thumbnail_urls: mediaThumbnailUrls,
    media_file_ids: mediaFileIds,
    media_blur: mediaUrls.length > 0 ? mediaBlurArray : undefined,
    channel_ids: settings.channelIds,
    pin_message: settings.pinPost,
    disable_notification: !settings.notifySubscribers,
    disable_web_page_preview: !showLinkPreview,
    status,
    inline_keyboard: inlineKeyboard,
    poll_data: pollData ? (pollData as PollData) : undefined,
    tag_names: settings.tagName ? [settings.tagName] : undefined,
    tag_color: settings.tagColor || undefined,
    repeat_interval: settings.repeatInterval,
    repeat_custom_days: settings.repeatInterval === 'custom' ? settings.repeatCustomDays : undefined,
    repeat_custom_hours: settings.repeatInterval === 'custom' ? settings.repeatCustomHours : undefined,
  };
}
