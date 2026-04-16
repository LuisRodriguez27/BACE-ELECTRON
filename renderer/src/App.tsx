import { createRouter, RouterProvider, createHashHistory } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuth } from '@/hooks/use-auth'
import UpdateBanner from '@/components/layout/UpdateBanner'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
const hashHistory = createHashHistory()

const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent',
  history: hashHistory,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // No retry on 401/403 errors
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        return failureCount < 3
      }
    }
  }
})

function AppWrapper() {
  // Initialize auth hook to check authentication status
  useAuth()

  return <RouterProvider router={router} />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWrapper />
      <UpdateBanner />
      <ReactQueryDevtools 
        initialIsOpen={false} 
        buttonPosition='bottom-left'
      />
    </QueryClientProvider>
  )
}

export default App
