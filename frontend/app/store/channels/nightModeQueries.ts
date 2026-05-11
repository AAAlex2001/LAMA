import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';

export interface NightModeSettings {
  night_mode_enabled: boolean;
  night_mode_start: string | null;
  night_mode_end: string | null;
  night_mode_block_media: boolean;
  night_mode_block_text: boolean;
}

export const nightModeKeys = {
  all: ['night-mode'] as const,
  byChannel: (channelId: number) => [...nightModeKeys.all, channelId] as const,
};

export function useUpdateNightModeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: number; data: NightModeSettings }) =>
      apiRequest<NightModeSettings>(`/channels/${channelId}/night-mode`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: nightModeKeys.byChannel(channelId) }),
  });
}
