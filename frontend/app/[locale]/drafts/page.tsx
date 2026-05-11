'use client';

import React from 'react';
import { AppLayout } from '@/components/app-layout';
import DraftsPageView from './components/DraftsPageView';

export default function DraftsPage() {
  return (
    <AppLayout pageTitle="Черновики">
      <DraftsPageView />
    </AppLayout>
  );
}
