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
import { fetchBotCommandsThunk } from './thunks';

const createBotCommandStore = () =>
  configureStore({
    reducer: {
      list: listReducer,
      form: formReducer,
    },
  });

type BotCommandStore = ReturnType<typeof createBotCommandStore>;
export type BotCommandState = ReturnType<BotCommandStore['getState']>;
export type BotCommandDispatch = BotCommandStore['dispatch'];

const BotCommandContext = createContext<BotCommandStore | null>(null);

export const useBotCommandDispatch: () => BotCommandDispatch = () =>
  createDispatchHook(BotCommandContext as any)() as BotCommandDispatch;

export const useBotCommandSelector: TypedUseSelectorHook<BotCommandState> = createSelectorHook(
  BotCommandContext as any,
) as any;

interface BotCommandProviderProps {
  botId: number;
  channelId: number;
  children: ReactNode;
}

export const BotCommandProvider: FC<BotCommandProviderProps> = ({ botId, channelId, children }) => {
  const storeRef = useRef<BotCommandStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createBotCommandStore();
  }

  useEffect(() => {
    if (botId && channelId && storeRef.current) {
      storeRef.current.dispatch(fetchBotCommandsThunk({ botId, channelId }));
    }
  }, [botId, channelId]);

  return (
    <Provider store={storeRef.current} context={BotCommandContext as any}>
      {children}
    </Provider>
  );
};

export { BotCommandContext };
