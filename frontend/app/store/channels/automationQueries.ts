import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';

export interface InfoMessageButton {
  text: string;
  url?: string;
}

export interface InfoMessage {
  id: number;
  channel_id: number;
  text: string;
  media_url: string | null;
  media_type: string | null;
  media_urls: string[] | null;
  inline_keyboard: InfoMessageButton[][] | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfoMessagesResponse {
  enabled: boolean;
  auto_reply_enabled: boolean;
  items: InfoMessage[];
}

export interface InfoMessageCreate {
  text: string;
  media_url?: string | null;
  media_type?: string | null;
  media_urls?: string[] | null;
  inline_keyboard?: InfoMessageButton[][] | null;
}

export interface InfoMessageUpdate {
  text?: string;
  media_url?: string | null;
  media_type?: string | null;
  media_urls?: string[] | null;
  inline_keyboard?: InfoMessageButton[][] | null;
  is_enabled?: boolean;
}

export const automationKeys = {
  all: ['channel-automation'] as const,
  infoMessages: (channelId: number) => [...automationKeys.all, 'info-messages', channelId] as const,
};

export function useInfoMessagesQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? automationKeys.infoMessages(channelId) : ['info-messages', 'disabled'],
    queryFn: () => apiRequest<InfoMessagesResponse>(`/channels/${channelId}/info-messages`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useToggleInfoMessagesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, enabled }: { channelId: number; enabled: boolean }) =>
      apiRequest(`/channels/${channelId}/info-messages/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: automationKeys.infoMessages(channelId) }),
  });
}

export function useCreateInfoMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: number; data: InfoMessageCreate }) =>
      apiRequest<InfoMessage>(`/channels/${channelId}/info-messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: automationKeys.infoMessages(channelId) }),
  });
}

export function useUpdateInfoMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId, messageId, data,
    }: { channelId: number; messageId: number; data: InfoMessageUpdate }) =>
      apiRequest<InfoMessage>(`/channels/${channelId}/info-messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: automationKeys.infoMessages(channelId) }),
  });
}

export function usePublishInfoMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, messageId }: { channelId: number; messageId: number }) =>
      apiRequest<InfoMessage>(`/channels/${channelId}/info-messages/${messageId}/publish`, {
        method: 'POST',
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: automationKeys.infoMessages(channelId) }),
  });
}

export function useDeleteInfoMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, messageId }: { channelId: number; messageId: number }) =>
      apiRequest(`/channels/${channelId}/info-messages/${messageId}`, { method: 'DELETE' }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: automationKeys.infoMessages(channelId) }),
  });
}

export function useToggleAutoRepliesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, enabled }: { channelId: number; enabled: boolean }) =>
      apiRequest(`/channels/${channelId}/auto-replies/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: automationKeys.infoMessages(channelId) }),
  });
}
