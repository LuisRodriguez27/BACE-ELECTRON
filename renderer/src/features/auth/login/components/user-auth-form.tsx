import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '../../AuthService'
import { useAuthStore } from '@/store/auth'
import { loginSchema, type LoginForm } from '../../types'
import { toast } from 'sonner'

export function UserAuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { setError } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.login(data)
      
      if (result.success) {
        toast.success(result.message)
        // Navegamos al dashboard después del login exitoso
        router.navigate({ to: '/' })
      } else {
        toast.error(result.message)
        setError(result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="username">Nombre de usuario</Label>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            disabled={isLoading}
            {...register('username')}
            className="mt-1"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={isLoading}
            {...register('password')}
            className="mt-1"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </Button>
    </form>
  )
}
