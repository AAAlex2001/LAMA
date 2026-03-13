import { useAppDispatch } from '../index';
import { sendMessageThunk } from '../thunks/globalMessages';
import type { SendMessageRequest } from '../thunks/globalMessages';


export function useSendGlobalMessage() {
  const dispatch = useAppDispatch();

  const sendGlobalMessage = async (params: { botIds: number[]; data: SendMessageRequest }) => {
    const results = await Promise.all(
      params.botIds.map(botId =>
        dispatch(sendMessageThunk({ botId, data: params.data })).unwrap()
      )
    );
    return results;
  };

  return { sendGlobalMessage };
}
