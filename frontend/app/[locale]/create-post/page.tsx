'use client';

import { Suspense } from 'react';
import { AppLayout } from '@/components/app-layout';
import { CreatePostProvider } from './store/provider';
import CreatePostView from './views/CreatePostView';

export default function CreatePostPage() {
  return (
    <AppLayout pageTitle="Новая публикация">
      <CreatePostProvider>
        <Suspense fallback={<div>Загрузка...</div>}>
          <CreatePostView />
        </Suspense>
      </CreatePostProvider>
    </AppLayout>
  );
}
