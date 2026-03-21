'use client';

import { FC, ReactNode, useEffect } from 'react';
import { Provider } from 'react-redux';
import { channelsPageStore, useAppDispatch } from './index';
import { fetchChannelsThunk } from '@/store/channels';

const StoreInit: FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchChannelsThunk({ force: true }));
  }, [dispatch]);

  return <>{children}</>;
};

export const ChannelsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Provider store={channelsPageStore}>
      <StoreInit>{children}</StoreInit>
    </Provider>
  );
};
