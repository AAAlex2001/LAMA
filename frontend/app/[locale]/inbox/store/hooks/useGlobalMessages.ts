import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../index';
import { fetchMessagesThunk, sendMessageThunk, type SendMessageRequest } from '../thunks/globalMessages';
import type { FetchMessagesParams } from '../thunks/globalMessages';

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
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ botId, data }: { botId: number; data: SendMessageRequest }) => {
      return await dispatch(sendMessageThunk({ botId, data })).unwrap();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.botId] });
    },
  });
}
