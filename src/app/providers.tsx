import { type ReactNode } from 'react'

// Future providers: QueryClientProvider, Toaster, SupabaseProvider, etc.
// Add them here as the stack grows.

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return <>{children}</>
}
