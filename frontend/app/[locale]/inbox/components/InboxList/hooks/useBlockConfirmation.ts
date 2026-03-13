import { useState, useRef } from "react";
import {
  useAppDispatch,
  specificInboxActionThunk,
} from "../../../store";
import type { InboxActionType, InboxEventResponse } from "../../../store";

interface PendingAction {
  eventId: number;
  payload?: Record<string, unknown>;
  username?: string;
  resolve?: (value: unknown) => void;
}

export function useBlockConfirmation(data: InboxEventResponse[]) {
  const dispatch = useAppDispatch();
  const dataRef = useRef(data);
  dataRef.current = data;

  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const handleAction = (
    eventId: number,
    actionType: InboxActionType,
    payload?: Record<string, unknown>
  ) => {
    if (actionType === 'block') {
      const item = dataRef.current.find(i => i.id === eventId);
      return new Promise((resolve) => {
        setPending({ eventId, payload, username: item?.tg_username || undefined, resolve });
        setIsOpen(true);
      });
    }
    return dispatch(specificInboxActionThunk({ eventId, action_type: actionType, payload }));
  };

  const confirm = async () => {
    if (!pending) return;
    const result = await dispatch(specificInboxActionThunk({
      eventId: pending.eventId,
      action_type: 'block',
      payload: pending.payload,
    }));
    pending.resolve?.(result);
    setPending(null);
  };

  const cancel = () => {
    pending?.resolve?.(undefined);
    setPending(null);
  };

  return {
    blockModal: { isOpen, setIsOpen, username: pending?.username, confirm, cancel },
    handleAction,
  };
}
