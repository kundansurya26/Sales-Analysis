import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, ReferenceLine, ComposedChart,
} from 'recharts'
import { formatCurrency, fmtMonth, CHART_COLORS, REGION_COLORS, CATEGORY_COLORS } from '@/utils/format'
import type { MonthlyRevenue, TopProduct, RegionPerformance, ForecastPoint, HeatmapCell, CategoryPerformance } from '@/types'
import { EmptyState } from '@/components/ui'

// ── Shared tooltip styles ─────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--tooltip-bg, #1f2937)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#f9fafb',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  labelStyle: { color: '#9ca3af', marginBottom: 4 },
}

// ── Revenue Trend ─────────────────────────────────────────────────────────────

export function RevenueTrendChart({ data }: { data: MonthlyRevenue[] }) {
  if (!data.length) return <EmptyState />
  const formatted = data.map(d => ({ ...d, month: fmtMonth(d.month) }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.profit} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_COLORS.profit} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, true)} width={60} />
        <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [formatCurrency(v), name === 'revenue' ? 'Revenue' : 'Profit']} />
        <Legend iconType="circle" iconSize={8} />
        <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} fill="url(#gradRevenue)" name="revenue" dot={false} activeDot={{ r: 4 }} />
        <Area type="monotone" dataKey="profit" stroke={CHART_COLORS.profit} strokeWidth={2} fill="url(#gradProfit)" name="profit" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Top Products Bar Chart ────────────────────────────────────────────────────

export function TopProductsChart({ data }: { data: TopProduct[] }) {
  if (!data.length) return <EmptyState />
  const truncated = data.slice(0, 8).map(d => ({
    ...d,
    name: d.product_name.length > 20 ? d.product_name.slice(0, 18) + '…' : d.product_name,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={truncated} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, true)} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={120} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
        <Bar dataKey="total_revenue" fill={CHART_COLORS.revenue} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Region Pie Chart ──────────────────────────────────────────────────────────

export function RegionPieChart({ data }: { data: RegionPerformance[] }) {
  if (!data.length) return <EmptyState />
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
          dataKey="total_revenue" nameKey="region" paddingAngle={3}>
          {data.map((_, i) => <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />)}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Forecast Chart ────────────────────────────────────────────────────────────

export function ForecastChart({ data }: { data: ForecastPoint[] }) {
  if (!data.length) return <EmptyState />
  const formatted = data.map(d => ({ ...d, month: fmtMonth(d.month) }))
  const splitIdx = formatted.findIndex(d => d.is_forecast)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.forecast} stopOpacity={0.15} />
            <stop offset="95%" stopColor={CHART_COLORS.forecast} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, true)} width={65} />
        <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => {
          const labels: Record<string, string> = { revenue: 'Revenue', upper_bound: 'Upper CI', lower_bound: 'Lower CI' }
          return [formatCurrency(v), labels[name] ?? name]
        }} />
        {splitIdx > 0 && (
          <ReferenceLine x={formatted[splitIdx].month} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Forecast', fill: '#f59e0b', fontSize: 11 }} />
        )}
        <Area type="monotone" dataKey="upper_bound" stroke="transparent" fill="url(#gradForecast)" />
        <Area type="monotone" dataKey="lower_bound" stroke="transparent" fill="white" fillOpacity={1} />
        <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} dot={false}
          strokeDasharray={(d: any) => d.is_forecast ? '5 3' : '0'} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Category Bar Chart ────────────────────────────────────────────────────────

export function CategoryChart({ data }: { data: CategoryPerformance[] }) {
  if (!data.length) return <EmptyState />
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
        <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, true)} width={60} />
        <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [
          name === 'profit_margin_pct' ? `${v.toFixed(1)}%` : formatCurrency(v),
          name === 'total_revenue' ? 'Revenue' : name === 'total_profit' ? 'Profit' : 'Margin %'
        ]} />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="total_revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={40} name="total_revenue" />
        <Bar dataKey="total_profit" fill={CHART_COLORS.profit} radius={[4, 4, 0, 0]} maxBarSize={40} name="total_profit" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function SalesHeatmap({ data }: { data: HeatmapCell[] }) {
  if (!data.length) return <EmptyState />

  const maxVal = Math.max(...data.map(d => d.value), 1)
  const getIntensity = (v: number) => Math.max(0.05, v / maxVal)

  const grid: Record<string, Record<string, number>> = {}
  data.forEach(({ weekday, month, value }) => {
    if (!grid[weekday]) grid[weekday] = {}
    grid[weekday][month] = value
  })

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Month headers */}
        <div className="flex ml-12 mb-1">
          {MONTHS_SHORT.map(m => (
            <div key={m} className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400">{m}</div>
          ))}
        </div>
        {/* Rows */}
        {WEEKDAYS.map(day => (
          <div key={day} className="flex items-center mb-1">
            <div className="w-10 text-xs text-gray-500 dark:text-gray-400 text-right pr-2 flex-shrink-0">{day}</div>
            {MONTHS_SHORT.map(month => {
              const val = grid[day]?.[month] ?? 0
              const alpha = getIntensity(val)
              return (
                <div key={month} className="flex-1 mx-0.5"
                  title={`${day} ${month}: ${formatCurrency(val)}`}
                >
                  <div
                    className="h-7 rounded-sm transition-opacity"
                    style={{ backgroundColor: `rgba(59, 130, 246, ${alpha})` }}
                  />
                </div>
              )
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-1 mt-3 ml-12">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Less</span>
          {[0.05, 0.2, 0.4, 0.6, 0.8, 1.0].map(a => (
            <div key={a} className="w-5 h-4 rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${a})` }} />
          ))}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">More</span>
        </div>
      </div>
    </div>
  )
}
