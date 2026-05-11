'use client';

import { Provider } from 'react-redux';
import { inboxStore } from './index';
import type { ReactNode } from 'react';

interface InboxProviderProps {
  children: ReactNode;
}

export function InboxProvider({ children }: InboxProviderProps) {
  return (
    <Provider store={inboxStore}>
      {children}
    </Provider>
  );
}
