import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { analyticsAPI, customersAPI } from '@/api/client'
import { Card, CardHeader, Badge, SkeletonChart } from '@/components/ui'
import { formatCurrency, formatNumber, SEGMENT_COLORS } from '@/utils/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts'
import type { RFMRecord, CustomerLTV, Customer } from '@/types'
import clsx from 'clsx'

const RFM_BADGE: Record<string, string> = {
  Gold:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Silver: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Bronze: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', fontSize: '12px', color: '#f9fafb',
  },
}

export function CustomersPage() {
  const [rfm, setRfm] = useState<RFMRecord[]>([])
  const [ltv, setLtv] = useState<CustomerLTV[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [rfmFilter, setRfmFilter] = useState('All')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const [rfmRes, ltvRes, custRes] = await Promise.all([
          analyticsAPI.rfm(),
          analyticsAPI.customerLTV(),
          customersAPI.list(),
        ])
        setRfm(rfmRes.data)
        setLtv(ltvRes.data)
        setCustomers(custRes.data)
      } catch { toast.error('Failed to load customer data') }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  const filteredRfm = rfmFilter === 'All' ? rfm : rfm.filter(r => r.segment === rfmFilter)

  // LTV chart
  const ltvChartData = ltv.map(l => ({
    segment: l.segment,
    'Avg LTV': l.avg_ltv,
    'Avg AOV': l.avg_order_value,
    fill: SEGMENT_COLORS[l.segment] ?? '#3b82f6',
  }))

  // Radar data for segments
  const radarData = ltv.map(l => ({
    metric: l.segment,
    LTV: Math.min(l.avg_ltv / 100, 100),
    Orders: Math.min(l.avg_orders * 5, 100),
    AOV: Math.min(l.avg_order_value / 10, 100),
  }))

  const segmentCounts = customers.reduce((acc, c) => {
    acc[c.customer_segment] = (acc[c.customer_segment] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Insights</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{customers.length} customers · RFM segmentation</p>
      </div>

      {/* Segment summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['Gold', 'Silver', 'Bronze'].map(seg => {
          const segData = ltv.find(l => l.segment === seg)
          return (
            <Card key={seg}>
              <div className="flex items-center justify-between mb-3">
                <span className={clsx('px-2.5 py-1 rounded-full text-xs font-bold', RFM_BADGE[seg])}>{seg}</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{segmentCounts[seg] ?? 0}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">customers</p>
              {segData && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg LTV</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(segData.avg_ltv)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Avg Orders</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{segData.avg_orders.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* LTV Bar + Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card padding={false}>
          <div className="p-5">
            <CardHeader title="Lifetime Value by Segment" subtitle="Average LTV vs average order value" />
          </div>
          {loading ? <SkeletonChart /> : (
            <div className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ltvChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
                  <XAxis dataKey="segment" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, true)} width={60} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="Avg LTV" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="Avg AOV" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="p-5">
            <CardHeader title="Segment Profile Radar" subtitle="Normalised scores per dimension" />
          </div>
          {loading ? <SkeletonChart /> : (
            <div className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={[
                  { metric: 'LTV',    ...Object.fromEntries(ltv.map(l => [l.segment, Math.min(l.avg_ltv / 50, 100)])) },
                  { metric: 'Orders', ...Object.fromEntries(ltv.map(l => [l.segment, Math.min(l.avg_orders * 3, 100)])) },
                  { metric: 'AOV',    ...Object.fromEntries(ltv.map(l => [l.segment, Math.min(l.avg_order_value / 10, 100)])) },
                ]} cx="50%" cy="50%" outerRadius={90}>
                  <PolarGrid stroke="rgba(156,163,175,0.2)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  {ltv.map((l, i) => (
                    <Radar key={l.segment} name={l.segment} dataKey={l.segment}
                      stroke={Object.values(SEGMENT_COLORS)[i]} fill={Object.values(SEGMENT_COLORS)[i]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Legend iconType="circle" iconSize={8} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* RFM Table */}
      <Card padding={false}>
        <div className="p-5 flex items-center justify-between flex-wrap gap-3">
          <CardHeader title="RFM Analysis" subtitle="Recency · Frequency · Monetary scoring" />
          <div className="flex gap-2">
            {['All', 'Gold', 'Silver', 'Bronze'].map(f => (
              <button key={f} onClick={() => setRfmFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  rfmFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                {['Customer', 'Segment', 'Recency', 'Frequency', 'Monetary', 'RFM Score'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-16" /></td>
                ))}</tr>
              )) : filteredRfm.slice(0, 50).map(r => (
                <tr key={r.customer_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.customer_name}</td>
                  <td className="px-4 py-3"><span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', RFM_BADGE[r.segment])}>{r.segment}</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.recency_days}d ago</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.frequency} orders</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{formatCurrency(r.monetary)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(r.rfm_score / 5) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-6">{r.rfm_score.toFixed(1)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
