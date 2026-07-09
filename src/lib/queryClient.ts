import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes stale time before data is considered old
      gcTime: 1000 * 60 * 10,    // 10 minutes garbage collection time
      refetchOnWindowFocus: false, // Turn off automatic refetching on window focus for more predictable UI
      retry: 1,                 // Retry failed network queries once
    },
  },
});
