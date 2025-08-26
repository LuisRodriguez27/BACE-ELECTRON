import { createLazyFileRoute, Navigate } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'
import { LoginPage } from '@/features/auth/login'

function LoginComponent() {
  const { isAuthenticated } = useAuthStore()
  
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" />
  }
  
  return <LoginPage />
}

export const Route = createLazyFileRoute('/login')({
  component: LoginComponent,
})
