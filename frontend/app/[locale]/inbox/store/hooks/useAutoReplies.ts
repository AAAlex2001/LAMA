
import { useAppDispatch, useAppSelector } from '../index';
import { fetchAutoRepliesThunk, createAutoReplyThunk } from '../thunks/autoReplies';
import type { AutoReplyCreate } from '../slices/autoReplies';
import type { FetchAutoRepliesParams } from '../thunks/autoReplies';
import type { RootState } from '../index';

export function useAutoReplies() {
  const dispatch = useAppDispatch();
  const autoReplies = useAppSelector((state: RootState) => state.autoReplies.autoReplies);
  const loading = useAppSelector((state: RootState) => state.autoReplies.loading);
  const error = useAppSelector((state: RootState) => state.autoReplies.error);

  const fetchAutoReplies = (params: FetchAutoRepliesParams) => dispatch(fetchAutoRepliesThunk(params));

  return { autoReplies, loading, error, fetchAutoReplies };
}

export function useCreateAutoReply() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state: RootState) => state.autoReplies.loading);

  const createAutoReply = (params: { botId: number; data: AutoReplyCreate }) => dispatch(createAutoReplyThunk(params));
  
  return { createAutoReply, loading };
}
