// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  full_name: string
  role: 'admin' | 'viewer'
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface Product {
  id: number
  name: string
  category: string
  unit_price: number
  cost_price: number
  description: string | null
  is_active: boolean
  margin_pct: number
  created_at: string
}

// ── Customer ──────────────────────────────────────────────────────────────────

export type CustomerSegment = 'Gold' | 'Silver' | 'Bronze'

export interface Customer {
  id: number
  name: string
  email: string
  region: string
  customer_segment: CustomerSegment
  join_date: string
  phone: string | null
  is_active: boolean
}

// ── Sale ──────────────────────────────────────────────────────────────────────

export interface Sale {
  id: number
  product_id: number
  customer_id: number
  product_name?: string
  customer_name?: string
  category?: string
  region?: string
  quantity: number
  sale_date: string
  discount_percent: number
  unit_price_at_sale: number
  revenue: number
  profit: number
}

export interface PaginatedSales {
  items: Sale[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface KPIs {
  total_revenue: number
  total_orders: number
  avg_order_value: number
  total_profit: number
  profit_margin_pct: number
  revenue_growth_pct: number | null
  orders_growth_pct: number | null
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  profit: number
  orders: number
}

export interface TopProduct {
  product_id: number
  product_name: string
  category: string
  total_revenue: number
  total_units: number
  profit_margin_pct: number
}

export interface RegionPerformance {
  region: string
  total_revenue: number
  total_orders: number
  customer_count: number
}

export interface CustomerLTV {
  segment: string
  avg_ltv: number
  customer_count: number
  avg_orders: number
  avg_order_value: number
}

export interface ForecastPoint {
  month: string
  revenue: number
  profit: number
  orders: number
  is_forecast: boolean
  lower_bound: number | null
  upper_bound: number | null
}

export interface RFMRecord {
  customer_id: number
  customer_name: string
  segment: string
  recency_days: number
  frequency: number
  monetary: number
  rfm_score: number
}

export interface HeatmapCell {
  weekday: string
  month: string
  value: number
}

export interface CategoryPerformance {
  category: string
  total_revenue: number
  total_profit: number
  profit_margin_pct: number
  total_units: number
  total_orders: number
}

export interface DashboardSummary {
  kpis: KPIs
  monthly_revenue: MonthlyRevenue[]
  top_products: TopProduct[]
  region_performance: RegionPerformance[]
}

// ── Filter state ──────────────────────────────────────────────────────────────

export interface DateRange {
  start: string | null
  end: string | null
}
