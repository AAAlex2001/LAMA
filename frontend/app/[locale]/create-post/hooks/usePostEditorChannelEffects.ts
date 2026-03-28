import { useEffect } from 'react';

import { useNotifications } from '@/components/notifications/NotificationProvider';

import { useAppDispatch, useAppSelector } from '../store';
import * as channelsSlice from '../store/slices/channels';
import * as settingsSlice from '../store/slices/settings';
import { fetchChannelsThunk } from '../store/thunks';

export function usePostEditorChannelEffects() {
  const dispatch = useAppDispatch();
  const { showError } = useNotifications();
  const replyToPostState = useAppSelector((state) => state.replyToPost);
  const channelsError = useAppSelector((state) => state.channels.error);

  useEffect(() => {
    dispatch(settingsSlice.setReplyToPostId(replyToPostState.selectedPost?.id ?? null));
  }, [dispatch, replyToPostState.selectedPost]);

  useEffect(() => {
    dispatch(fetchChannelsThunk({}));
  }, [dispatch]);

  useEffect(() => {
    if (!channelsError) return;
    showError(channelsError);
    dispatch(channelsSlice.clearError());
  }, [channelsError, dispatch, showError]);
}
