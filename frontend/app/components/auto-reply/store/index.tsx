'use client';

import { configureStore } from '@reduxjs/toolkit';
import {
  Provider,
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
  createDispatchHook,
  createSelectorHook,
} from 'react-redux';
import { createContext, useEffect, FC, ReactNode, useRef } from 'react';
import listReducer from './slices/list';
import formReducer from './slices/form';
import { fetchAutoRepliesThunk } from './thunks';

const createAutoReplyStore = () =>
  configureStore({
    reducer: {
      list: listReducer,
      form: formReducer,
    },
  });

type AutoReplyStore = ReturnType<typeof createAutoReplyStore>;
export type AutoReplyState = ReturnType<AutoReplyStore['getState']>;
export type AutoReplyDispatch = AutoReplyStore['dispatch'];

const AutoReplyContext = createContext<AutoReplyStore | null>(null);

export const useAutoReplyDispatch: () => AutoReplyDispatch = () =>
  createDispatchHook(AutoReplyContext as any)() as AutoReplyDispatch;

export const useAutoReplySelector: TypedUseSelectorHook<AutoReplyState> =
  createSelectorHook(AutoReplyContext as any) as any;

interface AutoReplyProviderProps {
  botId: number;
  channelId?: number;
  children: ReactNode;
}

export const AutoReplyProvider: FC<AutoReplyProviderProps> = ({ botId, channelId, children }) => {
  const storeRef = useRef<AutoReplyStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createAutoReplyStore();
  }

  useEffect(() => {
    if (botId && storeRef.current) {
      storeRef.current.dispatch(fetchAutoRepliesThunk({ botId, channelId }));
    }
  }, [botId, channelId]);

  return (
    <Provider store={storeRef.current} context={AutoReplyContext as any}>
      {children}
    </Provider>
  );
};

export { AutoReplyContext };
