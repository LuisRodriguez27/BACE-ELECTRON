import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/index'
import { StatsService } from './StatsService'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const StatsPage: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()])
  const [productId, setProductId] = useState<string>('all')
  const [products, setProducts] = useState<any[]>([])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
    loadYears()
  }, [])

  useEffect(() => {
    loadStats()
  }, [period, productId, selectedMonth, selectedYear])

  const loadYears = async () => {
    try {
      const years = await StatsService.getAvailableYears()
      setAvailableYears(years)
      // Check if current selected year is in available list, if not set to first
      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[0])
      }
    } catch (error) {
       console.error("Error loading years", error)
    }
  }

  const loadProducts = async () => {
    try {
      const prods = await StatsService.getProducts()
      setProducts(prods)
    } catch (error) {
      console.error(error)
    }
  }

  const loadStats = async () => {
    setLoading(true)
    try {
      const stats = await StatsService.getSalesStats({
        period,
        productId: productId === 'all' ? null : parseInt(productId),
        month: selectedMonth,
        year: selectedYear
      })
      setData(stats)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value)
  }

  const totalSales = (data?.salesOverTime || []).reduce((acc: number, item: any) => acc + item.total, 0)

  if (loading && !data) return <div className="p-8">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gráficas de Ventas</h1>
        
        <div className="flex gap-4">
          <select 
            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={period} 
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <option value="week">Esta Semana</option>
            <option value="month">Por Mes</option>
            <option value="year">Por Año</option>
          </select>

          {period === 'month' && (
            <select
              className="flex h-10 w-[140px] items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2000, i, 1), 'MMMM', { locale: es })}
                </option>
              ))}
            </select>
          )}

          {(period === 'month' || period === 'year') && (
             <select
              className="flex h-10 w-[100px] items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}

          <select
            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={productId} 
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="all">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Sales Summary */}
        <Card className="col-span-1 lg:col-span-2 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-2">
              <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">
                Ventas Totales del Periodo
              </span>
              <span className="text-4xl font-bold text-blue-900">
                {formatCurrency(totalSales)}
              </span>
              <span className="text-sm text-blue-500 capitalize">
                {period === 'week' ? 'Esta semana' : 
                 period === 'month' ? `${format(new Date(2000, selectedMonth - 1, 1), 'MMMM', { locale: es })} ${selectedYear}` :
                 `Año ${selectedYear}`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sales Over Time Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas por Tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.salesOverTime || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="sale_date" 
                    tickFormatter={(value) => {
                      if (!value) return '';
                      try {
                        return format(new Date(value), 'dd MMM', { locale: es })
                      } catch {
                        return value
                      }
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    labelFormatter={(label) => {
                      if (!label) return '';
                      try {
                        return format(new Date(label), 'dd MMMM yyyy', { locale: es })
                      } catch {
                        return label
                      }
                    }}
                  />
                  <Bar dataKey="total" fill="#2563eb" name="Ventas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products Table/Chart */}
        {productId === 'all' && (
          <>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Top Productos (Ingresos)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.salesByProduct?.slice(0, 10) || []} layout="vertical" margin={{ left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} fontSize={12} />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Bar dataKey="total" fill="#16a34a" name="Ingresos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Top Productos (Cantidad)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...(data?.salesByProduct || [])].sort((a,b) => b.quantity - a.quantity).slice(0, 10)} layout="vertical" margin={{ left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} fontSize={12} />
                      <Tooltip formatter={(value: any) => [value, 'Unidades']} />
                      <Bar dataKey="quantity" fill="#f59e0b" name="Cantidad" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default StatsPage
