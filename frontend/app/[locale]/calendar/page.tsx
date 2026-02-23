'use client';

import dynamic from 'next/dynamic';
import { CalendarProvider } from './store/provider';
import { AppLayout } from '@/components/app-layout';

const CalendarPageConnected = dynamic(
  () => import('./components/CalendarPageConnected'),
  { ssr: false },
);

export default function CalendarPage() {
  return (
    <AppLayout pageTitle="Календарь">
      <CalendarProvider>
        <CalendarPageConnected />
      </CalendarProvider>
    </AppLayout>
  );
}
