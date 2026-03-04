import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../index';
import { fetchAutoRepliesThunk, createAutoReplyThunk } from '../thunks/autoReplies';
import type { AutoReplyCreate } from '../slices/autoReplies';
import type { FetchAutoRepliesParams } from '../thunks/autoReplies';

export function useAutoReplies(params: FetchAutoRepliesParams) {
  const dispatch = useAppDispatch();
  
  return useQuery({
    queryKey: ['autoReplies', params.botId, params.isActive],
    queryFn: async () => {
      const result = await dispatch(fetchAutoRepliesThunk(params)).unwrap();
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCreateAutoReply() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ botId, data }: { botId: number; data: AutoReplyCreate }) => {
      return await dispatch(createAutoReplyThunk({ botId, data })).unwrap();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch auto replies queries
      queryClient.invalidateQueries({ queryKey: ['autoReplies', variables.botId] });
    },
  });
}
