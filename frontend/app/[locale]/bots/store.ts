import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { botsReducer } from '@/store/bots';
import { channelsReducer } from '@/store/channels';

export const botsPageStore = configureStore({
  reducer: {
    bots: botsReducer,
    channels: channelsReducer,
  },
});

export type BotsPageState = ReturnType<typeof botsPageStore.getState>;
export type BotsPageDispatch = typeof botsPageStore.dispatch;

export const useAppDispatch: () => BotsPageDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<BotsPageState> = useSelector;
