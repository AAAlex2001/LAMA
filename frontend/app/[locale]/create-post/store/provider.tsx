'use client';

import { Provider } from 'react-redux';
import { store } from './index';
import type { ReactNode } from 'react';
import { useRef, useEffect } from 'react';
import { setMediaFileStoreRef } from './mediaFileStore';

interface CreatePostProviderProps {
  children: ReactNode;
}

export function CreatePostProvider({ children }: CreatePostProviderProps) {
  const mediaFileStoreRef = useRef<Map<string, File>>(new Map());

  useEffect(() => {
    setMediaFileStoreRef(mediaFileStoreRef);
  }, []);

  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}
