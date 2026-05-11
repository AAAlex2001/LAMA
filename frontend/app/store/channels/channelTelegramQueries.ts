import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, apiRequest, getAuthToken } from '@/store/api';
import type { Channel } from '@/types/channel';
import { invalidateChannels } from './queries';

export interface UpdateChannelTelegramRequest {
  title?: string;
  description?: string;
}

export function useUpdateChannelTelegramMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: number; data: UpdateChannelTelegramRequest }) =>
      apiRequest<Channel>(`/channels/${channelId}/telegram-settings`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateChannels(qc),
  });
}

export function useUploadChannelPhotoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, file }: { channelId: number; file: File }) => {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('photo', file);
      const response = await fetch(`${API_BASE_URL}/channels/${channelId}/telegram-photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Ошибка загрузки фото');
      }
      return (await response.json()) as Channel;
    },
    onSuccess: () => invalidateChannels(qc),
  });
}

export function useDeleteChannelPhotoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: number) =>
      apiRequest<Channel>(`/channels/${channelId}/telegram-photo`, { method: 'DELETE' }),
    onSuccess: () => invalidateChannels(qc),
  });
}
