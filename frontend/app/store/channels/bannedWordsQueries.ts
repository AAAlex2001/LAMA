import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';

export interface BannedWordRule {
  id: number;
  phrase: string;
  action: string;
  mute_duration_minutes: number | null;
}

interface RawRule {
  id: number;
  channel_id: number;
  action: string;
  phrase: string;
  mute_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface RulesListResponse {
  items: RawRule[];
  total: number;
}

export interface BannedWordsState {
  enabled: boolean;
  rules: BannedWordRule[];
}

export const bannedWordsKeys = {
  all: ['banned-words'] as const,
  byChannel: (channelId: number) => [...bannedWordsKeys.all, channelId] as const,
};

function toRule(r: RawRule): BannedWordRule {
  return {
    id: r.id,
    phrase: r.phrase,
    action: r.action,
    mute_duration_minutes: r.mute_duration_minutes,
  };
}

export function useBannedWordsQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? bannedWordsKeys.byChannel(channelId) : ['banned-words', 'disabled'],
    queryFn: async (): Promise<BannedWordsState> => {
      const [rulesData, toggleData] = await Promise.all([
        apiRequest<RulesListResponse>(`/channels/${channelId}/moderation/rules`),
        apiRequest<{ banned_words_enabled: boolean }>(`/channels/${channelId}/banned-words/toggle`),
      ]);
      return { enabled: toggleData.banned_words_enabled, rules: rulesData.items.map(toRule) };
    },
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useToggleBannedWordsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, enabled }: { channelId: number; enabled: boolean }) =>
      apiRequest(`/channels/${channelId}/banned-words/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: bannedWordsKeys.byChannel(channelId) }),
  });
}

export interface AddBannedWordRequest {
  phrase: string;
  action: string;
  mute_duration_minutes: number | null;
}

export function useAddBannedWordMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: number; data: AddBannedWordRequest }) =>
      apiRequest<RawRule>(`/channels/${channelId}/moderation/rules`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: bannedWordsKeys.byChannel(channelId) }),
  });
}

export function useDeleteBannedWordMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, ruleId }: { channelId: number; ruleId: number }) =>
      apiRequest(`/channels/${channelId}/moderation/rules/${ruleId}`, { method: 'DELETE' }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: bannedWordsKeys.byChannel(channelId) }),
  });
}

export interface UpdateBannedWordsActionRequest {
  action: string;
  mute_duration_minutes: number | null;
}

export function useBulkUpdateBannedWordsActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      channelId, ruleIds, data,
    }: { channelId: number; ruleIds: number[]; data: UpdateBannedWordsActionRequest }) => {
      await Promise.all(
        ruleIds.map((id) =>
          apiRequest(`/channels/${channelId}/moderation/rules/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
          }),
        ),
      );
    },
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: bannedWordsKeys.byChannel(channelId) }),
  });
}
