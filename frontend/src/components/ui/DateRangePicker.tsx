import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { QUICK_RANGES } from '@/utils/format'
import type { DateRange } from '@/types'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const label = value.start && value.end
    ? `${value.start} → ${value.end}`
    : value.start
    ? `From ${value.start}`
    : 'All time'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
          'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
          'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
        )}
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span>{label}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-72">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick ranges</p>
            <div className="grid grid-cols-2 gap-1 mb-4">
              {Object.entries(QUICK_RANGES).map(([name, fn]) => (
                <button
                  key={name}
                  onClick={() => { onChange(fn() as DateRange); setOpen(false) }}
                  className="text-xs px-2 py-1.5 rounded-lg text-left text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Custom range</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start date</label>
                <input
                  type="date"
                  value={value.start ?? ''}
                  onChange={(e) => onChange({ ...value, start: e.target.value || null })}
                  className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">End date</label>
                <input
                  type="date"
                  value={value.end ?? ''}
                  onChange={(e) => onChange({ ...value, end: e.target.value || null })}
                  className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => { onChange({ start: null, end: null }); setOpen(false) }}
                className="w-full text-xs text-gray-500 hover:text-red-500 py-1 transition-colors"
              >
                Clear filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
