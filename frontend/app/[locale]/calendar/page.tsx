'use client';

import { CalendarProvider } from './store/provider';
import { AppLayout } from '@/components/app-layout';
import { CalendarPageConnected } from './components';

export default function CalendarPage() {
  return (
    <AppLayout pageTitle="Календарь">
      <CalendarProvider>
        <CalendarPageConnected />
      </CalendarProvider>
    </AppLayout>
  );
}
