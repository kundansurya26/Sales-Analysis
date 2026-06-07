import { format, parseISO, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns'

// ── Number formatting ─────────────────────────────────────────────────────────

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPct(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function fmtDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy')
}

export function fmtMonth(ym: string): string {
  // "2024-03" → "Mar 2024"
  return format(parseISO(`${ym}-01`), 'MMM yyyy')
}

export const QUICK_RANGES = {
  'Last 7 days':    () => ({ start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),  end: format(new Date(), 'yyyy-MM-dd') }),
  'Last 30 days':   () => ({ start: format(subDays(new Date(), 29), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }),
  'Last 3 months':  () => ({ start: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),end: format(new Date(), 'yyyy-MM-dd') }),
  'Last 12 months': () => ({ start: format(subMonths(new Date(), 11), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }),
  'This month':     () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }),
  'All time':       () => ({ start: null, end: null }),
} as const

// ── CSV download from blob ────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Segment colours ───────────────────────────────────────────────────────────

export const SEGMENT_COLORS: Record<string, string> = {
  Gold: '#f59e0b',
  Silver: '#6b7280',
  Bronze: '#b45309',
}

export const REGION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
export const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

// ── Recharts custom tooltip ───────────────────────────────────────────────────

export const CHART_COLORS = {
  revenue: '#3b82f6',
  profit:  '#10b981',
  orders:  '#f59e0b',
  forecast:'#8b5cf6',
  upper:   '#c4b5fd',
  lower:   '#c4b5fd',
}
