import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/')({
  component: HomeRedirect,
})

function HomeRedirect() {
  const { isAuthenticated } = useAuthStore()
  
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" />
  }
  
  return <Navigate to="/login" />
}
