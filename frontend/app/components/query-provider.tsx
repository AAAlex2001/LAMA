'use client';

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/store/query-client';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
