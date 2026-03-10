import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../index';
import { fetchMessagesThunk, sendMessageThunk, type SendMessageRequest } from '../thunks/globalMessages';
import type { FetchMessagesParams } from '../thunks/globalMessages';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { BotMessageResponse } from '../thunks/globalMessages';

export function useMessages(params: FetchMessagesParams) {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['messages', params.botId, params.chat_id, params.is_incoming, params.page, params.page_size],
    queryFn: async () => {
      const result = await dispatch(fetchMessagesThunk(params)).unwrap();
      return result;
    },
    staleTime: 30 * 1000,
  });
}

export function useSendGlobalMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ botIds, data }: { botIds: number[]; data: SendMessageRequest }) => {
      const results = await Promise.all(
        botIds.map(botId =>
          apiRequest<BotMessageResponse>(`/bots/${botId}/messages`, {
            method: 'POST',
            body: JSON.stringify(data),
          })
        )
      );
      return results;
    },
    onSuccess: (_, variables) => {
      variables.botIds.forEach(botId => {
        queryClient.invalidateQueries({ queryKey: ['messages', botId] });
      });
    },
  });
}
