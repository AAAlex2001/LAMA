'use client';

import { Provider } from 'react-redux';
import { store } from './index';
import type { ReactNode } from 'react';

interface CreatePostProviderProps {
  children: ReactNode;
}

export function CreatePostProvider({ children }: CreatePostProviderProps) {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}
