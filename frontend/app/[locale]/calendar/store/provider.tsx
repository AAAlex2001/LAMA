'use client';

import { Provider } from 'react-redux';
import { calendarStore } from './index';
import type { ReactNode } from 'react';

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  return (
    <Provider store={calendarStore}>
      {children}
    </Provider>
  );
}
