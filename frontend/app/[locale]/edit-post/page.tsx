'use client';

import { Suspense } from 'react';
import { AppLayout } from '@/components/app-layout';
import { CreatePostProvider } from '../create-post/store/provider';
import EditPostView from './components/EditPostView';

export default function EditPostPage() {
  return (
    <AppLayout pageTitle="Редактирование поста">
      <CreatePostProvider>
        <Suspense fallback={<div>Загрузка...</div>}>
          <EditPostView />
        </Suspense>
      </CreatePostProvider>
    </AppLayout>
  );
}
