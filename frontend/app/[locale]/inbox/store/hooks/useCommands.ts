import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../index';
import { fetchCommandsThunk, createCommandThunk } from '../thunks/commands';
import type { BotCommandCreate } from '../slices/commands';
import type { FetchCommandsParams } from '../thunks/commands';

export function useCommands(params: FetchCommandsParams) {
  const dispatch = useAppDispatch();
  
  return useQuery({
    queryKey: ['commands', params.botId, params.isActive],
    queryFn: async () => {
      const result = await dispatch(fetchCommandsThunk(params)).unwrap();
      return result;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateCommand() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ botId, data }: { botId: number; data: BotCommandCreate }) => {
      return await dispatch(createCommandThunk({ botId, data })).unwrap();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch commands queries
      queryClient.invalidateQueries({ queryKey: ['commands', variables.botId] });
    },
  });
}
