'use client';

import { Provider } from 'react-redux';
import { store } from './index';
import type { ReactNode } from 'react';
import { useRef, useEffect } from 'react';
import { setMediaFileStoreRef } from './mediaFileStore';
import { TemplatesProvider } from '@/components/text-templates-modal';
import { DraftsProvider } from '@/components/drafts-modal';
import { DatePickerProvider } from '@/components/date-picker';
import { ReplyToPostProvider } from '@/components/reply-to-post-modal';

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
      <TemplatesProvider>
        <DraftsProvider>
          <DatePickerProvider>
            <ReplyToPostProvider>
              {children}
            </ReplyToPostProvider>
          </DatePickerProvider>
        </DraftsProvider>
      </TemplatesProvider>
    </Provider>
  );
}
