'use client';

import { Provider } from 'react-redux';
import { draftsStore } from './index';
import type { ReactNode } from 'react';

interface DraftsProviderProps {
  children: ReactNode;
}

export function DraftsProvider({ children }: DraftsProviderProps) {
  return (
    <Provider store={draftsStore}>
      {children}
    </Provider>
  );
}
