import { useReducer } from 'react';
import { useSpecificInboxActionMutation } from '@/store/inbox';

type BlockConfirmState = {
  isOpen: boolean;
  eventId: number | null;
  username?: string;
  payload?: Record<string, unknown>;
};

type BlockConfirmAction =
  | { type: 'open'; eventId: number; username?: string; payload?: Record<string, unknown> }
  | { type: 'close' }
  | { type: 'clear' };

function reducer(state: BlockConfirmState, action: BlockConfirmAction): BlockConfirmState {
  switch (action.type) {
    case 'open':
      return { isOpen: true, eventId: action.eventId, username: action.username, payload: action.payload };
    case 'close':
      return { ...state, isOpen: false };
    case 'clear':
      return { isOpen: false, eventId: null };
    default:
      return state;
  }
}

export function useBlockConfirmation() {
  const [blockConfirm, blockDispatch] = useReducer(reducer, { isOpen: false, eventId: null });
  const mutation = useSpecificInboxActionMutation();

  const confirm = async () => {
    if (!blockConfirm.eventId) return;
    await mutation.mutateAsync({
      eventId: blockConfirm.eventId,
      action_type: 'block',
      payload: blockConfirm.payload,
    });
    blockDispatch({ type: 'clear' });
  };

  const cancel = () => blockDispatch({ type: 'clear' });
  const onOpenChange = (open: boolean) => {
    if (!open) blockDispatch({ type: 'clear' });
  };

  return { blockConfirm, blockDispatch, confirm, cancel, onOpenChange };
}

export type { BlockConfirmAction };
