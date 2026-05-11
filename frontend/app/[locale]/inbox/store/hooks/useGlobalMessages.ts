import { useSendBotMessageMutation, type SendMessageRequest } from '@/store/inbox';

export function useSendGlobalMessage() {
  const mutation = useSendBotMessageMutation();

  const sendGlobalMessage = async (params: { botIds: number[]; data: SendMessageRequest }) => {
    return Promise.all(
      params.botIds.map((botId) => mutation.mutateAsync({ botId, data: params.data })),
    );
  };

  return { sendGlobalMessage };
}
