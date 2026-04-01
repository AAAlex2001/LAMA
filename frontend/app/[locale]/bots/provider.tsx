'use client';

import { FC, ReactNode, useEffect } from 'react';
import { Provider } from 'react-redux';
import { botsPageStore } from './store';
import { fetchBotsThunk } from '@/store/bots';
import { fetchChannelsThunk } from '@/store/channels';

const StoreInit: FC<{ children: ReactNode }> = ({ children }) => {
  useEffect(() => {
    botsPageStore.dispatch(fetchBotsThunk({}));
    botsPageStore.dispatch(fetchChannelsThunk({ force: true }));
  }, []);

  return <>{children}</>;
};

export const BotsProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <Provider store={botsPageStore}>
    <StoreInit>{children}</StoreInit>
  </Provider>
);
