import { useState, useEffect, useCallback } from 'react'
import { Download, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesAPI, analyticsAPI } from '@/api/client'
import { Card, CardHeader, Button, Badge, Input, SkeletonChart } from '@/components/ui'
import { CategoryChart } from '@/components/charts'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { formatCurrency, fmtDate, downloadBlob } from '@/utils/format'
import type { Sale, PaginatedSales, DateRange, CategoryPerformance } from '@/types'
import clsx from 'clsx'

const SEGMENT_BADGE: Record<string, 'yellow' | 'gray' | 'amber'> = {
  Gold: 'yellow', Silver: 'gray', Bronze: 'amber',
}

export function SalesPage() {
  const [data, setData] = useState<PaginatedSales | null>(null)
  const [categories, setCategories] = useState<CategoryPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('sale_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null })
  const PAGE_SIZE = 50

  const fetchSales = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: PAGE_SIZE,
        sort_by: sortBy,
        sort_dir: sortDir,
        ...(dateRange.start && { start_date: dateRange.start }),
        ...(dateRange.end && { end_date: dateRange.end }),
      }
      const [salesRes, catRes] = await Promise.all([
        salesAPI.list(params),
        analyticsAPI.categoryPerformance({
          ...(dateRange.start && { start_date: dateRange.start }),
          ...(dateRange.end && { end_date: dateRange.end }),
        }),
      ])
      setData(salesRes.data)
      setCategories(catRes.data)
    } catch {
      toast.error('Failed to load sales data')
    } finally {
      setLoading(false)
    }
  }, [page, sortBy, sortDir, dateRange])

  useEffect(() => { fetchSales() }, [fetchSales])
  useEffect(() => { setPage(1) }, [dateRange, sortBy, sortDir])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = {
        ...(dateRange.start && { start_date: dateRange.start }),
        ...(dateRange.end && { end_date: dateRange.end }),
      }
      const res = await salesAPI.exportCSV(params)
      downloadBlob(res.data, 'sales_export.csv')
      toast.success('CSV downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: string }) => (
    <span className={clsx('ml-1 text-xs', sortBy === col ? 'text-blue-500' : 'text-gray-400')}>
      {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  const filtered = data?.items.filter(s =>
    !search || [s.product_name, s.customer_name, s.category, s.region]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  ) ?? []

  const totalPages = data?.total_pages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {data ? `${data.total.toLocaleString()} transactions` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExport} loading={exporting}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Category performance chart */}
      <Card padding={false}>
        <div className="p-5">
          <CardHeader title="Profit Margin by Category" subtitle="Revenue vs profit breakdown" />
        </div>
        {loading ? <SkeletonChart /> : (
          <div className="px-5 pb-5">
            <CategoryChart data={categories} />
          </div>
        )}
      </Card>

      {/* Sales table */}
      <Card padding={false}>
        <div className="p-5 flex items-center justify-between gap-4">
          <CardHeader title="Transaction Log" />
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search product, customer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                {[['sale_date', 'Date'], ['—', 'Product'], ['—', 'Customer'], ['—', 'Region'], ['—', 'Segment'],
                  ['quantity', 'Qty'], ['—', 'Unit Price'], ['—', 'Discount'], ['revenue', 'Revenue'], ['—', 'Profit']
                ].map(([col, label]) => (
                  <th key={label}
                    onClick={() => col !== '—' && toggleSort(col)}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap',
                      col !== '—' && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200'
                    )}
                  >
                    {label}{col !== '—' && <SortIcon col={col} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-400 py-12">No transactions found</td></tr>
              ) : filtered.map((sale: Sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtDate(sale.sale_date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-40 truncate">{sale.product_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-32 truncate">{sale.customer_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{sale.region}</td>
                  <td className="px-4 py-3">
                    <Badge variant={SEGMENT_BADGE[sale.region] ?? 'gray'}>{sale.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white text-right">{sale.quantity}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-right">{formatCurrency(sale.unit_price_at_sale)}</td>
                  <td className="px-4 py-3 text-right">
                    {sale.discount_percent > 0
                      ? <span className="text-amber-600 dark:text-amber-400">{sale.discount_percent}%</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white text-right whitespace-nowrap">{formatCurrency(sale.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={clsx('font-medium', sale.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                      {formatCurrency(sale.profit)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages} · {data.total.toLocaleString()} total
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setPage(1)} disabled={page === 1} icon={<ChevronsLeft className="w-4 h-4" />} />
              <Button variant="ghost" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1} icon={<ChevronLeft className="w-4 h-4" />} />
              <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">{page}</span>
              <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} icon={<ChevronRight className="w-4 h-4" />} />
              <Button variant="ghost" size="sm" onClick={() => setPage(totalPages)} disabled={page >= totalPages} icon={<ChevronsRight className="w-4 h-4" />} />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
