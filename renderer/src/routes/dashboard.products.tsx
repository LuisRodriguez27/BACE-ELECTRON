import { createFileRoute } from '@tanstack/react-router'
import ProductsPage from '@/features/products'

export const Route = createFileRoute('/dashboard/products')({
  component: ProductsPage
})
