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
  const [showPassword, setShowPassword] = useState(false)
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
        // toast.success(result.message)
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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              disabled={isLoading}
              {...register('password')}
              className="mt-1"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[calc(50%+2px)] transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
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
