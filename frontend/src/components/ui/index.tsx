import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency, formatPct } from '@/utils/format'

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  className?: string
  children: React.ReactNode
  padding?: boolean
}
export function Card({ className, children, padding = true }: CardProps) {
  return (
    <div className={clsx(
      'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm',
      padding && 'p-5',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const BADGE_VARIANTS = {
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  gray:   'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export function Badge({ children, variant = 'gray' }: { children: React.ReactNode; variant?: keyof typeof BADGE_VARIANTS }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', BADGE_VARIANTS[variant])}>
      {children}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-200 dark:bg-gray-700 rounded', className)} />
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="h-4 w-32 mb-3" />
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-20" />
    </Card>
  )
}

export function SkeletonChart() {
  return (
    <Card>
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-64 w-full" />
    </Card>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-gray-300 border-t-blue-500', s, className)} />
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string
  value: string
  change?: number | null
  icon: React.ReactNode
  iconBg: string
  loading?: boolean
}

export function KPICard({ title, value, change, icon, iconBg, loading }: KPICardProps) {
  if (loading) return <SkeletonCard />

  const positive = change != null && change > 0
  const negative = change != null && change < 0

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change != null && (
            <div className={clsx('flex items-center gap-1 mt-1 text-xs font-medium',
              positive ? 'text-green-600 dark:text-green-400' :
              negative ? 'text-red-500 dark:text-red-400' : 'text-gray-500'
            )}>
              {positive ? <TrendingUp className="w-3 h-3" /> :
               negative ? <TrendingDown className="w-3 h-3" /> :
               <Minus className="w-3 h-3" />}
              {formatPct(change)} vs prev period
            </div>
          )}
        </div>
        <div className={clsx('p-2.5 rounded-lg', iconBg)}>{icon}</div>
      </div>
    </Card>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

const BTN_VARIANTS = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
  secondary: 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600',
  ghost:     'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
}
const BTN_SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        BTN_VARIANTS[variant], BTN_SIZES[size], className
      )}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700',
        'text-sm text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
        className
      )}
    />
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700',
        'text-sm text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400',
        className
      )}
    />
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
      <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  )
}
