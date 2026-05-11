import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';

export type ApprovalMode = 'AUTO' | 'MANUAL' | 'CRITERIA';
export type CaptchaFailAction = 'KICK' | 'BAN' | 'MUTE' | 'REJECT';

export interface AutoApprovalData {
  auto_approval_mode: ApprovalMode;
  approval_criteria: { required_channels?: number[] } | null;
}

export interface CaptchaSettingsData {
  captcha_enabled: boolean;
  captcha_timeout_seconds: number;
  captcha_fail_action: CaptchaFailAction;
  captcha_fail_duration_seconds: number | null;
  captcha_restriction_type: string | null;
  captcha_message_before: string | null;
  captcha_message_fail: string | null;
  captcha_message_success: string | null;
}

export const joinSettingsKeys = {
  all: ['join-settings'] as const,
  autoApproval: (botId: number) => [...joinSettingsKeys.all, 'auto-approval', botId] as const,
  captcha: (channelId: number) => [...joinSettingsKeys.all, 'captcha', channelId] as const,
};

// === Auto-approval =======================================================

export function useAutoApprovalQuery(botId: number | null) {
  return useQuery({
    queryKey: botId !== null ? joinSettingsKeys.autoApproval(botId) : ['auto-approval', 'disabled'],
    queryFn: () => apiRequest<AutoApprovalData>(`/bots/${botId}/auto-approval`),
    enabled: botId !== null,
    staleTime: 60 * 1000,
  });
}

export interface UpdateAutoApprovalRequest {
  auto_approval_mode: ApprovalMode;
  approval_criteria: { required_channels: number[] } | null;
}

export function useUpdateAutoApprovalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ botId, data }: { botId: number; data: UpdateAutoApprovalRequest }) =>
      apiRequest<AutoApprovalData>(`/bots/${botId}/auto-approval`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { botId }) =>
      qc.invalidateQueries({ queryKey: joinSettingsKeys.autoApproval(botId) }),
  });
}

// === Captcha =============================================================

export function useCaptchaSettingsQuery(channelId: number | null) {
  return useQuery({
    queryKey: channelId !== null ? joinSettingsKeys.captcha(channelId) : ['captcha', 'disabled'],
    queryFn: () => apiRequest<CaptchaSettingsData>(`/channels/${channelId}/captcha`),
    enabled: channelId !== null,
    staleTime: 60 * 1000,
  });
}

export function useUpdateCaptchaSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId, data,
    }: { channelId: number; data: Partial<CaptchaSettingsData> }) =>
      apiRequest<CaptchaSettingsData>(`/channels/${channelId}/captcha`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { channelId }) =>
      qc.invalidateQueries({ queryKey: joinSettingsKeys.captcha(channelId) }),
  });
}
