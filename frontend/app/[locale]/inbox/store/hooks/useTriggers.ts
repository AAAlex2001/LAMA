import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../index';
import { fetchTriggersThunk, createTriggerThunk } from '../thunks/triggers';
import type { TriggerCreate } from '../slices/triggers';
import type { FetchTriggersParams } from '../thunks/triggers';

export function useTriggers(params: FetchTriggersParams) {
  const dispatch = useAppDispatch();
  
  return useQuery({
    queryKey: ['triggers', params.botId, params.triggerType, params.isActive],
    queryFn: async () => {
      const result = await dispatch(fetchTriggersThunk(params)).unwrap();
      return result;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateTrigger() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ botId, data }: { botId: number; data: TriggerCreate }) => {
      return await dispatch(createTriggerThunk({ botId, data })).unwrap();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['triggers', variables.botId] });
    },
  });
}
