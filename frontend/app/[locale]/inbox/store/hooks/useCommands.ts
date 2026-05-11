import { useCreateBotCommandMutation, type BotCommandCreate } from '@/store/inbox';

export function useCreateCommand() {
  const mutation = useCreateBotCommandMutation();
  const createCommand = (params: { botId: number; data: BotCommandCreate }) =>
    mutation.mutateAsync(params);
  return { createCommand, loading: mutation.isPending };
}
