import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
