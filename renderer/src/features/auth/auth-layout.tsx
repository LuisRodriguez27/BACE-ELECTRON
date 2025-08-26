import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
        
        <div className="bg-white p-8 shadow-lg rounded-lg">
          {children}
        </div>
      </div>
    </div>
  )
}
