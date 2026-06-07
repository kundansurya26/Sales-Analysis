import { useState, useEffect, useCallback } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Percent, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { dashboardAPI, analyticsAPI } from '@/api/client'
import { KPICard, Card, CardHeader, SkeletonChart, Button } from '@/components/ui'
import { RevenueTrendChart, TopProductsChart, RegionPieChart, SalesHeatmap } from '@/components/charts'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { formatCurrency, formatNumber } from '@/utils/format'
import type { DateRange, DashboardSummary, HeatmapCell } from '@/types'

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        ...(dateRange.start && { start_date: dateRange.start }),
        ...(dateRange.end && { end_date: dateRange.end }),
      }
      const [sumRes, heatRes] = await Promise.all([
        dashboardAPI.summary(params),
        analyticsAPI.heatmap(),
      ])
      setSummary(sumRes.data)
      setHeatmap(heatRes.data)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { fetchData() }, [fetchData])

  const kpis = summary?.kpis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Sales performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={kpis ? formatCurrency(kpis.total_revenue) : '—'}
          change={kpis?.revenue_growth_pct} loading={loading}
          icon={<DollarSign className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-900/20" />
        <KPICard title="Total Orders" value={kpis ? formatNumber(kpis.total_orders) : '—'}
          change={kpis?.orders_growth_pct} loading={loading}
          icon={<ShoppingCart className="w-5 h-5 text-green-600" />} iconBg="bg-green-50 dark:bg-green-900/20" />
        <KPICard title="Avg Order Value" value={kpis ? formatCurrency(kpis.avg_order_value) : '—'}
          change={null} loading={loading}
          icon={<TrendingUp className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-900/20" />
        <KPICard title="Profit Margin" value={kpis ? `${kpis.profit_margin_pct.toFixed(1)}%` : '—'}
          change={null} loading={loading}
          icon={<Percent className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50 dark:bg-purple-900/20" />
      </div>

      {/* Revenue Trend + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" padding={false}>
          <div className="p-5">
            <CardHeader title="Revenue Trend" subtitle="Monthly revenue vs profit" />
          </div>
          {loading ? <SkeletonChart /> : (
            <div className="px-5 pb-5">
              <RevenueTrendChart data={summary?.monthly_revenue ?? []} />
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="p-5">
            <CardHeader title="Top Products" subtitle="By total revenue" />
          </div>
          {loading ? <SkeletonChart /> : (
            <div className="px-5 pb-5">
              <TopProductsChart data={summary?.top_products ?? []} />
            </div>
          )}
        </Card>
      </div>

      {/* Region Pie + Heatmap */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card padding={false}>
          <div className="p-5">
            <CardHeader title="Sales by Region" subtitle="Revenue distribution" />
          </div>
          {loading ? <SkeletonChart /> : (
            <div className="px-5 pb-5">
              <RegionPieChart data={summary?.region_performance ?? []} />
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="p-5">
            <CardHeader title="Activity Heatmap" subtitle="Revenue intensity by weekday × month" />
          </div>
          {loading ? <SkeletonChart /> : (
            <div className="px-5 pb-5">
              <SalesHeatmap data={heatmap} />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
