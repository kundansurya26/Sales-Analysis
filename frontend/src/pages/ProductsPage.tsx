import { useState, useEffect } from 'react'
import { Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsAPI, analyticsAPI } from '@/api/client'
import { Card, CardHeader, Badge, SkeletonChart } from '@/components/ui'
import { CategoryChart } from '@/components/charts'
import { formatCurrency } from '@/utils/format'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts'
import type { Product, TopProduct, CategoryPerformance } from '@/types'
import { CATEGORY_COLORS } from '@/utils/format'

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [categories, setCategories] = useState<CategoryPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const [pRes, tpRes, catRes] = await Promise.all([
          productsAPI.list({ is_active: true }),
          analyticsAPI.topProducts({ limit: 50 }),
          analyticsAPI.categoryPerformance(),
        ])
        setProducts(pRes.data)
        setTopProducts(tpRes.data)
        setCategories(catRes.data)
      } catch { toast.error('Failed to load products') }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  const categoryNames = ['All', ...Array.from(new Set(products.map(p => p.category)))]

  // Build scatter data: price vs volume per product
  const scatterData = topProducts.map(tp => {
    const prod = products.find(p => p.id === tp.product_id)
    return {
      name: tp.product_name,
      x: prod?.unit_price ?? 0,       // price
      y: tp.total_units,              // volume
      z: tp.total_revenue / 1000,     // bubble size
      category: tp.category,
      margin: tp.profit_margin_pct,
    }
  })

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory)

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px', fontSize: '12px', color: '#f9fafb',
    },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Performance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{products.length} active products across {categoryNames.length - 1} categories</p>
      </div>

      {/* Category performance */}
      <Card padding={false}>
        <div className="p-5">
          <CardHeader title="Category Breakdown" subtitle="Revenue and profit by category" />
        </div>
        {loading ? <SkeletonChart /> : (
          <div className="px-5 pb-5">
            <CategoryChart data={categories} />
          </div>
        )}
      </Card>

      {/* Price vs Volume scatter */}
      <Card padding={false}>
        <div className="p-5">
          <CardHeader title="Price vs Volume Matrix" subtitle="Bubble size = total revenue" />
        </div>
        {loading ? <SkeletonChart /> : (
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
                <XAxis dataKey="x" type="number" name="Unit Price" tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} label={{ value: 'Unit Price ($)', position: 'insideBottom', offset: -3, fill: '#6b7280', fontSize: 11 }} />
                <YAxis dataKey="y" type="number" name="Units Sold" tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false} axisLine={false} label={{ value: 'Units Sold', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }} />
                <ZAxis dataKey="z" range={[40, 400]} />
                <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs text-white">
                        <p className="font-semibold mb-1">{d.name}</p>
                        <p>Price: {formatCurrency(d.x)}</p>
                        <p>Units: {d.y.toLocaleString()}</p>
                        <p>Margin: {d.margin}%</p>
                        <p className="text-gray-400">{d.category}</p>
                      </div>
                    )
                  }}
                />
                {CATEGORY_COLORS.map((color, i) => {
                  const cat = categoryNames[i + 1]
                  const catData = scatterData.filter(d => d.category === cat)
                  return catData.length ? (
                    <Scatter key={cat} name={cat} data={catData} fill={color} fillOpacity={0.7} />
                  ) : null
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Product grid */}
      <Card padding={false}>
        <div className="p-5 flex items-center justify-between flex-wrap gap-3">
          <CardHeader title="Product Catalogue" subtitle={`${filteredProducts.length} products`} />
          <div className="flex gap-2 flex-wrap">
            {categoryNames.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                {['Product', 'Category', 'Unit Price', 'Cost', 'Margin %', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-20" /></td>
                  ))}</tr>
                ))
              ) : filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <Package className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="blue">{p.category}</Badge></td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{formatCurrency(p.unit_price)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatCurrency(p.cost_price)}</td>
                  <td className="px-4 py-3">
                    <span className={p.margin_pct >= 50 ? 'text-green-600 dark:text-green-400 font-medium' : p.margin_pct >= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}>
                      {p.margin_pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
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
