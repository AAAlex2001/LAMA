import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/store/api';
import { queryClient as defaultQueryClient } from '@/store/query-client';

export type TriggerType =
  | 'JOIN_REQUEST_CREATED'
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_REJECTED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'CAPTCHA_PASSED'
  | 'CAPTCHA_FAILED'
  | 'USER_MESSAGE'
  | 'COMMAND_CALLED';

export type TriggerActionType =
  | 'SEND_MESSAGE'
  | 'SEND_MEDIA'
  | 'ADD_TO_GROUP'
  | 'REMOVE_FROM_GROUP'
  | 'MUTE_USER'
  | 'BAN_USER';

export type TriggerChatType = 'PRIVATE' | 'GROUP' | 'BOTH';

export interface Trigger {
  id: number;
  bot_id: number;
  name: string;
  trigger_type: TriggerType;
  action_type: TriggerActionType;
  action_data: Record<string, unknown>;
  delay_minutes: number;
  delivery_window?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  chat_type: TriggerChatType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TriggerCreate {
  name: string;
  trigger_type: TriggerType;
  action_type: TriggerActionType;
  action_data: Record<string, unknown>;
  delay_minutes: number;
  delivery_window?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  chat_type: TriggerChatType;
  is_active: boolean;
}

interface TriggerListResponse {
  items: Trigger[];
  total: number;
}

export const triggersKeys = {
  all: ['triggers'] as const,
  byBot: (botId: number, triggerType?: TriggerType | null, isActive?: boolean | null) =>
    [...triggersKeys.all, 'bot', botId, { triggerType: triggerType ?? null, isActive: isActive ?? null }] as const,
};

export function useTriggersQuery(
  botId: number | null,
  triggerType?: TriggerType | null,
  isActive?: boolean | null,
) {
  return useQuery({
    queryKey: botId !== null
      ? triggersKeys.byBot(botId, triggerType, isActive)
      : ['triggers', 'disabled'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (triggerType !== undefined && triggerType !== null) params.set('trigger_type', triggerType);
      if (isActive !== undefined && isActive !== null) params.set('is_active', String(isActive));
      const qs = params.toString();
      const response = await apiRequest<TriggerListResponse>(
        `/bots/${botId}/triggers${qs ? `?${qs}` : ''}`,
      );
      return response.items ?? [];
    },
    enabled: botId !== null,
    staleTime: 30 * 1000,
  });
}

export function useCreateTriggerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ botId, data }: { botId: number; data: TriggerCreate }) =>
      apiRequest<Trigger>(`/bots/${botId}/triggers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { botId }) =>
      qc.invalidateQueries({ queryKey: [...triggersKeys.all, 'bot', botId] }),
  });
}

export function invalidateTriggers(qc: QueryClient = defaultQueryClient) {
  qc.invalidateQueries({ queryKey: triggersKeys.all });
}
