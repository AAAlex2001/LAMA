'use client';

import React from 'react';
import { AppLayout } from '@/components/app-layout';
import { DraftsProvider } from './store/provider';
import DraftsPageView from './components/DraftsPageView';

export default function DraftsPage() {
  return (
    <AppLayout pageTitle="Черновики">
      <DraftsProvider>
        <DraftsPageView />
      </DraftsProvider>
    </AppLayout>
  );
}
