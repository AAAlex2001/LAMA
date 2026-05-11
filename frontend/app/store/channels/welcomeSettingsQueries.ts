import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';

export type WelcomeMediaType =
  | 'TEXT'
  | 'PHOTO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'AUDIO'
  | 'VOICE'
  | 'STICKER'
  | 'ANIMATION'
  | null;

export interface WelcomeButton {
  text: string;
  url?: string;
}

export interface WelcomeResponse {
  welcome_enabled: boolean;
  welcome_message: string | null;
  welcome_media_url: string | null;
  welcome_media_type: WelcomeMediaType;
  welcome_buttons: { inline_keyboard: WelcomeButton[][] } | null;
  welcome_message_thread_id: number | null;
  welcome_type: string;
}

export interface WelcomeSettings {
  enabled: boolean;
  message: string | null;
  mediaUrl: string | null;
  mediaType: 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'ANIMATION' | null;
  buttons: WelcomeButton[][] | null;
  messageThreadId: number | null;
  welcomeType: string;
}

export interface ForumTopic {
  thread_id: number;
  name: string;
  icon_color: number | null;
  icon_custom_emoji_id: string | null;
  is_closed: boolean;
}

export type WelcomeUpdateRequest = Partial<{
  welcome_enabled: boolean;
  welcome_message: string | null;
  welcome_media_url: string | null;
  welcome_media_type: WelcomeMediaType;
  welcome_buttons: { inline_keyboard: WelcomeButton[][] } | null;
  welcome_message_thread_id: number | null;
  welcome_type: string;
}>;

export const welcomeSettingsKeys = {
  all: ['welcomeSettings'] as const,
  byBot: (botId: number) => [...welcomeSettingsKeys.all, 'bot', botId] as const,
  topics: (channelId: number) => [...welcomeSettingsKeys.all, 'topics', channelId] as const,
};

function mapResponse(data: WelcomeResponse): WelcomeSettings {
  const buttons = data.welcome_buttons?.inline_keyboard ?? null;
  const mediaType = data.welcome_media_type as 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'ANIMATION' | null;
  return {
    enabled: data.welcome_enabled,
    message: data.welcome_message,
    mediaUrl: data.welcome_media_url,
    mediaType,
    buttons,
    messageThreadId: data.welcome_message_thread_id,
    welcomeType: data.welcome_type ?? 'group_message',
  };
}

export function useWelcomeSettingsQuery(botId: number | null) {
  return useQuery({
    queryKey: botId !== null ? welcomeSettingsKeys.byBot(botId) : ['welcomeSettings', 'disabled'],
    queryFn: async () => {
      const data = await apiRequest<WelcomeResponse>(`/bots/${botId}/welcome`);
      return mapResponse(data);
    },
    enabled: botId !== null,
    staleTime: 60 * 1000,
  });
}

export function useToggleWelcomeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ botId, enabled }: { botId: number; enabled: boolean }) =>
      apiRequest<WelcomeResponse>(`/bots/${botId}/welcome`, {
        method: 'PUT',
        body: JSON.stringify({ welcome_enabled: enabled }),
      }),
    onSuccess: (data, { botId }) => {
      qc.setQueryData(welcomeSettingsKeys.byBot(botId), mapResponse(data));
    },
  });
}

export function useUpdateWelcomeSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ botId, data }: { botId: number; data: WelcomeUpdateRequest }) =>
      apiRequest<WelcomeResponse>(`/bots/${botId}/welcome`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (data, { botId }) => {
      qc.setQueryData(welcomeSettingsKeys.byBot(botId), mapResponse(data));
    },
  });
}

export function useDeleteWelcomeMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (botId: number) =>
      apiRequest<WelcomeResponse>(`/bots/${botId}/welcome`, {
        method: 'PUT',
        body: JSON.stringify({
          welcome_message: null,
          welcome_media_url: null,
          welcome_media_type: null,
          welcome_buttons: null,
        }),
      }),
    onSuccess: (data, botId) => {
      qc.setQueryData(welcomeSettingsKeys.byBot(botId), mapResponse(data));
    },
  });
}

export function useForumTopicsQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? welcomeSettingsKeys.topics(channelId) : ['welcomeSettings', 'topics', 'disabled'],
    queryFn: () => apiRequest<ForumTopic[]>(`/channels/${channelId}/topics`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}
