'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { inboxStore } from './index';
import type { ReactNode } from 'react';
import { fetchChannelsThunk } from '@/store/channels';
import { fetchBotsThunk } from '@/store/bots';

interface InboxProviderProps {
  children: ReactNode;
}

function InboxInitializer({ children }: { children: ReactNode }) {
  useEffect(() => {
    inboxStore.dispatch(fetchChannelsThunk({}));
    inboxStore.dispatch(fetchBotsThunk({}));
  }, []);

  return <>{children}</>;
}

export function InboxProvider({ children }: InboxProviderProps) {
  return (
    <Provider store={inboxStore}>
      <InboxInitializer>
        {children}
      </InboxInitializer>
    </Provider>
  );
}
