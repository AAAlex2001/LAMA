import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { channelsReducer } from '@/store/channels';
import botsReducer from './slices/bots';
import backupReducer from './slices/backup';
import joinSettingsReducer from './slices/joinSettings';
import inviteLinksReducer from './slices/inviteLinks';
import moderationReducer from './slices/moderation';
import bannedWordsReducer from './slices/bannedWords';

export const channelsPageStore = configureStore({
  reducer: {
    channels: channelsReducer,
    bots: botsReducer,
    backup: backupReducer,
    joinSettings: joinSettingsReducer,
    inviteLinks: inviteLinksReducer,
    moderation: moderationReducer,
    bannedWords: bannedWordsReducer,
  },
});

export type ChannelsPageState = ReturnType<typeof channelsPageStore.getState>;
export type ChannelsPageDispatch = typeof channelsPageStore.dispatch;

export const useAppDispatch: () => ChannelsPageDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<ChannelsPageState> = useSelector;
