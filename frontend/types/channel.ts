export type ChannelType = 'CHANNEL' | 'GROUP' | 'SUPERGROUP';
export type BackupMode = 'DISABLED' | 'ENABLED' | 'INSTANT' | 'POST_FACTUM';

export interface Channel {
  id: number;
  telegram_id: number;
  channel_type: ChannelType;
  title: string;
  username: string;
  first_name: string;
  last_name: string;
  description: string;
  invite_link: string;
  bio: string;
  accent_color_id: number;
  profile_accent_color_id: number;
  background_custom_emoji_id: string;
  profile_background_custom_emoji_id: string;
  emoji_status_custom_emoji_id: string;
  emoji_status_expiration_date: number;
  is_forum: boolean;
  is_direct_messages: boolean;
  max_reaction_count: number;
  slow_mode_delay: number;
  unrestrict_boost_count: number;
  message_auto_delete_time: number;
  night_mode_enabled: boolean;
  night_mode_start: string;
  night_mode_end: string;
  night_mode_block_media: boolean;
  night_mode_block_text: boolean;
  has_private_forwards: boolean;
  has_restricted_voice_and_video_messages: boolean;
  has_aggressive_anti_spam_enabled: boolean;
  has_hidden_members: boolean;
  has_protected_content: boolean;
  has_visible_history: boolean;
  join_to_send_messages: boolean;
  join_by_request: boolean;
  can_send_paid_media: boolean;
  sticker_set_name: string;
  can_set_sticker_set: boolean;
  custom_emoji_sticker_set_name: string;
  linked_chat_id: number;
  parent_chat_id: number;
  location_address: string;
  location_latitude: string;
  location_longitude: string;
  members_count: number;
  photo_url: string;
  photo_small_file_id: string;
  photo_small_file_unique_id: string;
  photo_big_file_id: string;
  photo_big_file_unique_id: string;
  permissions: Record<string, any>;
  available_reactions: string[];
  accepted_gift_types: Record<string, any>;
  active_usernames: string[];
  pinned_message: Record<string, any>;
  business_intro: Record<string, any>;
  business_location: Record<string, any>;
  business_opening_hours: Record<string, any>;
  birthdate: Record<string, any>;
  personal_chat: Record<string, any>;
  backup_mode: BackupMode;
  backup_target_id: number;
  bot_id: number;
  is_bot_active: boolean;
  is_active: boolean;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
  extra_data: Record<string, any>;
}

export interface ChannelBasic {
  id: number;
  title: string;
  selected?: boolean;
  members_count?: number;
  photo_url?: string;
  username?: string;
  invite_link?: string;
  channel_type?: ChannelType;
  description?: string;
  bot_id?: number;
  is_bot_active?: boolean;
}

export interface ChannelListResponse {
  items: Channel[];
  total: number;
  page: number;
  page_size: number;
}

export interface ChannelsResponse {
  items?: ChannelBasic[];
  total?: number;
}

export interface FetchChannelsParams {
  page?: number;
  page_size?: number;
  channel_type?: ChannelType | null;
  is_active?: boolean | null;
  backup_mode?: BackupMode | null;
}

export interface SyncChannelRequest {
  token?: string;
  bot_id?: number;
  telegram_id?: number;
  username?: string;
  invite_link?: string;
}

export interface SyncChannelResponse {
  success: boolean;
  message?: string;
  channel?: ChannelBasic;
}

export interface ChannelOption {
  id: string;
  label: string;
  checked?: boolean;
  members_count?: number;
  photo_url?: string;
}
