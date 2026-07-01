'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSkillStore } from '@/lib/skill-store'
import { ErrorBoundary } from '@/components/skills/error-boundary'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  // Manually hydrate the persisted store after mount to avoid SSR hydration mismatch.
  // skipHydration: true in the persist config prevents auto-hydration during render.
  React.useEffect(() => {
    useSkillStore.persist.rehydrate()
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ErrorBoundary>
  )
}
