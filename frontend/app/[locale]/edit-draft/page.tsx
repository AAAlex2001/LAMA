'use client';

import { Suspense } from 'react';
import { AppLayout } from '@/components/app-layout';
import { CreatePostProvider } from '../create-post/store/provider';
import EditDraftView from './components/EditDraftView';

export default function EditDraftPage() {
  return (
    <AppLayout pageTitle="Редактирование черновика">
      <CreatePostProvider>
        <Suspense fallback={<div>Загрузка...</div>}>
          <EditDraftView />
        </Suspense>
      </CreatePostProvider>
    </AppLayout>
  );
}
