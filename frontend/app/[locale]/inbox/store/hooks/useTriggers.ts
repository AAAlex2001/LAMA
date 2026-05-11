import { useCreateTriggerMutation, type TriggerCreate } from '@/store/inbox';

export function useCreateTrigger() {
  const mutation = useCreateTriggerMutation();
  const createTrigger = (params: { botId: number; data: TriggerCreate }) =>
    mutation.mutateAsync(params);
  return { createTrigger, loading: mutation.isPending };
}
