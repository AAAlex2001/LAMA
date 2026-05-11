import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';
import type { Channel, BackupMode } from '@/types/channel';
import { invalidateChannels } from './queries';

export interface BackupModePayload {
  backup_mode: BackupMode;
  backup_target_ids: number[] | null;
  backup_post_types: string[] | null;
  backup_content_types: string[] | null;
  backup_ai_prompt: string | null;
}

export interface BackupStats {
  channel_id: number;
  total_backed_up_posts: number;
  total_retransmissions: number;
  backup_size_mb: number;
  first_post_date: string | null;
  last_post_date: string | null;
}

export const backupKeys = {
  all: ['channel-backup'] as const,
  stats: (channelId: number) => [...backupKeys.all, 'stats', channelId] as const,
  dayCounts: (channelId: number) => [...backupKeys.all, 'day-counts', channelId] as const,
};

export function useBackupStatsQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? backupKeys.stats(channelId) : ['backup-stats', 'disabled'],
    queryFn: () => apiRequest<BackupStats>(`/channels/${channelId}/stats`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useBackupDayCountsQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? backupKeys.dayCounts(channelId) : ['backup-day-counts', 'disabled'],
    queryFn: () => apiRequest<Record<string, number>>(`/channels/${channelId}/backup-day-counts`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

/** Универсальная mutation: payload собирается на стороне consumer'а. */
export function useUpdateBackupModeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, payload }: { channelId: number; payload: BackupModePayload }) =>
      apiRequest<Channel>(`/channels/${channelId}/backup-mode`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { channelId }) => {
      invalidateChannels(qc);
      qc.invalidateQueries({ queryKey: backupKeys.stats(channelId) });
    },
  });
}

export interface RestoreBackupRequest {
  sourceChannelId: number;
  targetChannelId: number;
  contentTypes?: string[];
  dateRange?: { start: Date; end: Date } | null;
}

export function useRestoreBackupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceChannelId, targetChannelId, contentTypes, dateRange }: RestoreBackupRequest) =>
      apiRequest<{ success: boolean; job_id: number; message: string }>('/channels/restore', {
        method: 'POST',
        body: JSON.stringify({
          source_channel_id: sourceChannelId,
          target_channel_id: targetChannelId,
          content_types: contentTypes?.length ? contentTypes : null,
          start_date: dateRange?.start?.toISOString() ?? null,
          end_date: dateRange?.end?.toISOString() ?? null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backupKeys.all });
    },
  });
}
