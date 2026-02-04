import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Printer, X, Plus } from 'lucide-react'
import { StatsService } from './StatsService'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfWeek, endOfWeek, setWeek, getWeek } from 'date-fns'
import { es } from 'date-fns/locale'

const StatsPage: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month')
  const [selectedWeek, setSelectedWeek] = useState<number>(getWeek(new Date()))
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()])
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])
  const [productId, setProductId] = useState<string>('all')
  const [products, setProducts] = useState<any[]>([])
  const [selectedDates, setSelectedDates] = useState<string[]>([format(new Date(), 'yyyy-MM-dd')])
  const [tempDate, setTempDate] = useState<string>('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
    loadYears()
  }, [])

  useEffect(() => {
    if (period === 'week') {
      loadWeeks()
    }
  }, [selectedYear, period])

  // Effect to ensure selectedWeek is valid for the selected month
  useEffect(() => {
    if (period === 'week') {
      const date = setWeek(new Date(selectedYear, 0, 4), selectedWeek, { weekStartsOn: 1 })
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })

      // Strictly ensure the selected week belongs to the selected month (starts in it)
      const isValid = weekStart.getMonth() === (selectedMonth - 1) && weekStart.getFullYear() === selectedYear

      if (!isValid) {
        // Find first available week in this month
        const monthStart = new Date(selectedYear, selectedMonth - 1, 1)
        const monthEnd = new Date(selectedYear, selectedMonth, 0)

        let current = startOfWeek(monthStart, { weekStartsOn: 1 })
        let found = false

        // Try to find a week WITH sales first
        if (availableWeeks.length > 0) {
          for (let i = 0; i < 6; i++) {
            if (current > monthEnd && current.getMonth() !== (selectedMonth - 1)) break

            const wStart = startOfWeek(current, { weekStartsOn: 1 })
            if (wStart.getMonth() === (selectedMonth - 1)) {
              const wNum = getWeek(current, { weekStartsOn: 1 })
              if (availableWeeks.includes(wNum)) {
                setSelectedWeek(wNum)
                found = true
                break
              }
            }
            current = new Date(current)
            current.setDate(current.getDate() + 7)
          }
        }

        // If no sales found, default to the FIRST logical week that starts in this month
        if (!found) {
          let c = startOfWeek(monthStart, { weekStartsOn: 1 })
          // Iterate until we find one that starts in month
          for (let i = 0; i < 6; i++) {
            const wStart = startOfWeek(c, { weekStartsOn: 1 })
            if (wStart.getMonth() === (selectedMonth - 1)) {
              setSelectedWeek(getWeek(c, { weekStartsOn: 1 }))
              found = true;
              break;
            }
            c = new Date(c)
            c.setDate(c.getDate() + 7)
            if (c > monthEnd && c.getMonth() !== (selectedMonth - 1)) break
          }
        }
      }
    }
  }, [selectedMonth, selectedYear, period, availableWeeks])

  useEffect(() => {
    loadStats()
  }, [period, productId, selectedMonth, selectedYear, selectedWeek, selectedDates])

  const loadYears = async () => {
    try {
      const years = await StatsService.getAvailableYears()
      if (years && years.length > 0) {
        setAvailableYears(years)
        // Only override selectedYear if it's NOT in the list
        if (!years.includes(selectedYear)) {
             setSelectedYear(years[0])
        }
      }
    } catch (error) {
      console.error("Error loading years", error)
    }
  }

  const loadWeeks = async () => {
    try {
      const weeks = await StatsService.getAvailableWeeks(selectedYear)
      setAvailableWeeks(weeks)
    } catch (error) {
      console.error("Error loading weeks", error)
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
      let params: any = {
        period,
        productId: productId === 'all' ? null : parseInt(productId),
        month: selectedMonth,
        year: selectedYear
      }
      
      if (period === 'custom') {
        params.dates = selectedDates
      } else if (period === 'week') {
        // Calculate start and end date for the selected week in the selected year
        // We create a date in the selected year, then set the week
        // Note: week mapping can be tricky around year boundaries, but for basic stats:

        let date = new Date(selectedYear, 0, 4) // First week usually contains Jan 4th
        date = setWeek(date, selectedWeek, { weekStartsOn: 1 })

        const start = startOfWeek(date, { weekStartsOn: 1 })
        const end = endOfWeek(date, { weekStartsOn: 1 })

        // Use full calculated week dates
        params.customStartDate = start.toISOString()
        params.customEndDate = end.toISOString()
      }

      const stats = await StatsService.getSalesStats(params)
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

  const handlePrint = () => {
    const totalSalesText = formatCurrency(totalSales)

    let periodText = ''
    if (period === 'custom') {
        const datesFormatted = selectedDates
          .sort()
          .map(d => format(new Date(d + 'T12:00:00'), "d 'de' MMM", { locale: es }))
          .join(', ');
        periodText = `Días: ${datesFormatted}`;
    } else if (period === 'week') {
      const date = setWeek(new Date(selectedYear, 0, 4), selectedWeek, { weekStartsOn: 1 })
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      periodText = `Semana del ${format(weekStart, "d 'de' MMMM", { locale: es })} al ${format(weekEnd, "d 'de' MMMM", { locale: es })} de ${selectedYear}`
    } else if (period === 'month') {
      periodText = `${format(new Date(2000, selectedMonth - 1, 1), 'MMMM', { locale: es })} ${selectedYear}`
    } else {
      periodText = `Año ${selectedYear}`
    }

    const getChartSvg = (id: string, title: string) => {
      const container = document.getElementById(id);
      if (!container) return '';
      const svg = container.querySelector('.recharts-surface');
      if (!svg) return '';

      const svgClone = svg.cloneNode(true) as SVGElement;
      svgClone.style.overflow = 'visible';
      // Force width for print specific
      svgClone.setAttribute('width', '100%');

      return `
        <div class="chart-container">
            <h3>${title}</h3>
            <div class="chart-wrapper">
                ${svgClone.outerHTML}
            </div>
        </div>
       `;
    }

    // Check if charts exist before trying to get them
    const timelineChart = getChartSvg('sales-over-time-chart', 'Ventas por Tiempo');
    const revenueChart = productId === 'all' ? getChartSvg('top-products-revenue-chart', 'Top Productos (Ingresos)') : '';
    const quantityChart = productId === 'all' ? getChartSvg('top-products-quantity-chart', 'Top Productos (Cantidad)') : '';

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Ventas</title>
          <style>
            @page { size: letter portrait; margin: 1.5cm; }
            body { font-family: 'Arial', sans-serif; -webkit-print-color-adjust: exact; color: #1a1a1a; max-width: 100%; }
            .header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; }
            h1 { color: #1e40af; margin: 0; font-size: 24px; text-transform: uppercase; }
            .meta { color: #6b7280; font-size: 12px; margin-top: 5px; }
            
            .summary-card { 
                background-color: #eff6ff; 
                border: 1px solid #bfdbfe; 
                border-radius: 8px; 
                padding: 1.5rem; 
                text-align: center; 
                margin-bottom: 2rem; 
                page-break-inside: avoid;
            }
            .summary-label { font-size: 12px; text-transform: uppercase; color: #2563eb; font-weight: 700; letter-spacing: 0.05em; }
            .summary-value { font-size: 36px; font-weight: 800; color: #1e3a8a; display: block; margin: 0.5rem 0; }
            .summary-period { font-size: 14px; color: #3b82f6; text-transform: capitalize; }
            
            .chart-container { margin-bottom: 2rem; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; }
            .chart-container h3 { margin: 0 0 1rem 0; color: #374151; font-size: 16px; border-left: 4px solid #3b82f6; padding-left: 10px; }
            .chart-wrapper { display: flex; justify-content: center; overflow: hidden; }
            .chart-wrapper svg { width: 100% !important; height: auto !important; max-height: 250px; }
            
            .row-charts { display: flex; gap: 15px; margin-bottom: 2rem; page-break-inside: avoid; }
            .row-charts .chart-container { flex: 1; margin-bottom: 0; width: 50%; }

            @media print {
               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
            <div class="header">
                <h1>Reporte de Ventas</h1>
                <div class="meta">Generado el: ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}</div>
            </div>
            
            <div class="summary-card">
                <div class="summary-label">Ventas Totales del Periodo</div>
                <span class="summary-value">${totalSalesText}</span>
                <span class="summary-period">${periodText}</span>
            </div>
            
            ${timelineChart}
            
            <div class="row-charts">
                ${revenueChart}
                ${quantityChart}
            </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  }

  if (loading && !data) return <div className="p-8">Cargando...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Gráficas de Ventas</h1>
      <div className="flex justify-between items-left">
        <div className="flex gap-4">
          <select
            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <option value="week">Por Semana</option>
            <option value="month">Por Mes</option>
            <option value="year">Por Año</option>
            <option value="custom">Por Días</option>
          </select>

          {period === 'custom' && (
             <div className="flex items-center gap-2">
                <input 
                    type="date" 
                    className="h-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    max={format(new Date(), 'yyyy-MM-dd')}
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)} 
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white"
                  disabled={!tempDate}
                  onClick={() => {
                      if(tempDate && !selectedDates.includes(tempDate)) {
                          setSelectedDates([...selectedDates, tempDate].sort())
                          setTempDate('')
                      }
                  }}
                >
                  <Plus />
                </Button>
             </div>
          )}

          {(period === 'month' || period === 'week') && (
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

          {period === 'week' && (
            <select
              className="flex h-10 w-[240px] items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            >
              {(() => {
                const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
                const lastDay = new Date(selectedYear, selectedMonth, 0);
                const options = [];
                // Start from the beginning of the week containing the 1st of the month
                let current = startOfWeek(firstDay, { weekStartsOn: 1 });
                let count = 0;

                // Safety loop limit increased to handle edge cases
                while (count < 6) {
                  // If we've passed the end of the month AND we've already added at least one valid week, stop.
                  // BUT, we must check if the current week starts in this month.
                  if (current > lastDay && current.getMonth() !== selectedMonth - 1) break;

                  const weekNum = getWeek(current, { weekStartsOn: 1 });
                  const start = startOfWeek(current, { weekStartsOn: 1 });
                  const end = endOfWeek(current, { weekStartsOn: 1 });

                  // Check if week truly belongs to this month (Starts in this month)
                  // This is the key logic requested: "Where does the week START?"
                  if (start.getMonth() === selectedMonth - 1) {
                    // Filter by availableWeeks
                    if (availableWeeks.includes(weekNum) || availableWeeks.length === 0) {
                      options.push({
                        weekNum,
                        label: `Semana ${options.length + 1} (${format(start, 'dd MMM', { locale: es })} - ${format(end, 'dd MMM', { locale: es })})`
                      });
                    }
                  } else {
                    // If the week starts in the previous month, but overlaps into this month...
                    // The requirement is: "Week belongs to the month where it starts".
                    // So if start < firstDay, it belongs to prev month. We SKIP it here.
                    // The while loop will continue to the next week which might start in this month.
                  }

                  // Move to next week
                  current = new Date(current);
                  current.setDate(current.getDate() + 7);
                  count++;
                }

                if (options.length === 0) return <option value={selectedWeek}>Sin ventas en este mes</option>


                return options.map((opt) => (
                  <option key={opt.weekNum} value={opt.weekNum}>
                    {opt.label}
                  </option>
                ))
              })()}
            </select>
          )}

          {(period === 'month' || period === 'year' || period === 'week') && (
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

          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer size={16} />
            Imprimir
          </Button>
        </div>
      </div>

      {period === 'custom' && selectedDates.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
             {selectedDates.sort().map(date => (
                <div key={date} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">
                    {format(new Date(date + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                     <button 
                        onClick={() => setSelectedDates(selectedDates.filter(d => d !== date))}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                     >
                        <X size={12} />
                     </button>
                </div>
            ))}
        </div>
      )}

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
            <div id="sales-over-time-chart" className="h-[400px]">
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
                <div id="top-products-revenue-chart" className="h-[300px]">
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
                <div id="top-products-quantity-chart" className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...(data?.salesByProduct || [])].sort((a, b) => b.quantity - a.quantity).slice(0, 10)} layout="vertical" margin={{ left: 50 }}>
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
