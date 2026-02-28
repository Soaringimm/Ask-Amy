import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes (reduced from 30min to prevent memory buildup)
      retry: 1,
      refetchOnWindowFocus: false,
      maxQueries: 10, // limit concurrent queries
      maxCachedQueries: 50, // limit cached queries
    },
  },
})
