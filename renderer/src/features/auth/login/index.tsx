import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function LoginPage() {
  return (
    <AuthLayout
      title="Iniciar Sesión"
      description="Ingresa tus credenciales para acceder al sistema"
    >
      <UserAuthForm />
    </AuthLayout>
  )
}
