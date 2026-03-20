import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import channelsReducer from '@/app/[locale]/create-post/store/slices/channels';
import botsReducer from './slices/bots';

export const channelsPageStore = configureStore({
  reducer: {
    channels: channelsReducer,
    bots: botsReducer,
  },
});

export type ChannelsPageState = ReturnType<typeof channelsPageStore.getState>;
export type ChannelsPageDispatch = typeof channelsPageStore.dispatch;

export const useAppDispatch: () => ChannelsPageDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<ChannelsPageState> = useSelector;
