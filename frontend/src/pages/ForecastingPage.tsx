import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { analyticsAPI } from '@/api/client'
import { Card, CardHeader, SkeletonChart, Select } from '@/components/ui'
import { ForecastChart } from '@/components/charts'
import { formatCurrency, fmtMonth } from '@/utils/format'
import type { ForecastPoint } from '@/types'

export function ForecastingPage() {
  const [data, setData] = useState<ForecastPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState(3)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await analyticsAPI.forecast(months)
        setData(res.data)
      } catch { toast.error('Failed to load forecast') }
      finally { setLoading(false) }
    }
    fetch()
  }, [months])

  const historical = data.filter(d => !d.is_forecast)
  const forecast = data.filter(d => d.is_forecast)

  // Summary stats
  const lastActual = historical[historical.length - 1]
  const firstForecast = forecast[0]
  const lastForecast = forecast[forecast.length - 1]
  const totalForecastRevenue = forecast.reduce((s, d) => s + d.revenue, 0)
  const growthVsLast = lastActual && firstForecast
    ? ((firstForecast.revenue - lastActual.revenue) / lastActual.revenue) * 100
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue Forecasting</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Linear regression model · 95% confidence interval
          </p>
        </div>
        <Select value={months} onChange={e => setMonths(Number(e.target.value))}>
          <option value={1}>Forecast 1 month</option>
          <option value={3}>Forecast 3 months</option>
          <option value={6}>Forecast 6 months</option>
          <option value={12}>Forecast 12 months</option>
        </Select>
      </div>

      {/* Forecast summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Forecast Revenue</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(totalForecastRevenue)}
          </p>
          <p className="text-xs text-gray-400 mt-1">over next {months} month{months > 1 ? 's' : ''}</p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Next Month Forecast</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {firstForecast ? formatCurrency(firstForecast.revenue) : '—'}
          </p>
          {growthVsLast != null && (
            <p className={`text-xs mt-1 font-medium ${growthVsLast >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {growthVsLast >= 0 ? '+' : ''}{growthVsLast.toFixed(1)}% vs last actual
            </p>
          )}
        </Card>

        <Card>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">End of Period Forecast</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {lastForecast ? formatCurrency(lastForecast.revenue) : '—'}
          </p>
          {lastForecast && (
            <div className="text-xs text-gray-400 mt-1">
              <span>{fmtMonth(lastForecast.month)}</span>
              {lastForecast.lower_bound != null && (
                <span className="ml-2">CI: {formatCurrency(lastForecast.lower_bound, true)} – {formatCurrency(lastForecast.upper_bound!, true)}</span>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Forecast chart */}
      <Card padding={false}>
        <div className="p-5">
          <CardHeader title="Revenue Forecast" subtitle="Historical actuals + predicted trend with confidence bands" />
        </div>
        {loading ? <SkeletonChart /> : (
          <div className="px-5 pb-5">
            <ForecastChart data={data} />
          </div>
        )}
      </Card>

      {/* Forecast table */}
      {forecast.length > 0 && (
        <Card padding={false}>
          <div className="p-5">
            <CardHeader title="Forecast Details" subtitle="Month-by-month projections with confidence intervals" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  {['Month', 'Predicted Revenue', 'Lower Bound (95%)', 'Upper Bound (95%)', 'Est. Profit'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {forecast.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-purple-600 dark:text-purple-400">{fmtMonth(row.month)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{formatCurrency(row.revenue)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {row.lower_bound != null ? formatCurrency(row.lower_bound) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {row.upper_bound != null ? formatCurrency(row.upper_bound) : '—'}
                    </td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">{formatCurrency(row.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Model notes */}
      <Card>
        <div className="flex gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Model Notes</p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc ml-4">
              <li>Forecast uses Ordinary Least Squares linear regression fit to the last 24 months of monthly revenue.</li>
              <li>Confidence intervals are based on ±1.96 standard deviations of training residuals (approx. 95% CI).</li>
              <li>The model assumes a linear trend — actual results may vary due to seasonality, market conditions, or business changes.</li>
              <li>Requires at least 6 months of historical data for meaningful projections.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
