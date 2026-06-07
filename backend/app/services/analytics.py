"""
Analytics service: all heavy computation lives here, not in endpoints.
Uses numpy/scikit-learn for linear regression forecasting.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, timedelta
from typing import List, Optional

import numpy as np
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Customer, Product, Sale

logger = logging.getLogger(__name__)

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


class AnalyticsService:
    """
    Central analytics service.
    All methods accept an open AsyncSession and optional date-range filters.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _load_sales(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> list[Sale]:
        """Load Sales with optional date filters."""
        q = select(Sale)
        if start_date:
            q = q.where(Sale.sale_date >= start_date)
        if end_date:
            q = q.where(Sale.sale_date <= end_date)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def _load_products(self) -> dict[int, Product]:
        result = await self.db.execute(select(Product))
        return {p.id: p for p in result.scalars().all()}

    async def _load_customers(self) -> dict[int, Customer]:
        result = await self.db.execute(select(Customer))
        return {c.id: c for c in result.scalars().all()}

    async def _date_bounds(self) -> tuple[Optional[date], Optional[date]]:
        """Return the actual min/max sale_date in the DB."""
        result = await self.db.execute(
            text("SELECT MIN(sale_date), MAX(sale_date) FROM sales")
        )
        row = result.fetchone()
        if not row or not row[0]:
            return None, None
        return (
            date.fromisoformat(str(row[0])),
            date.fromisoformat(str(row[1])),
        )

    # ── KPIs ──────────────────────────────────────────────────────────────────

    async def get_kpis(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """Compute headline KPIs for the given period and compare to prior period."""

        async def _period_stats(sd: Optional[date], ed: Optional[date]) -> dict:
            sales = await self._load_sales(sd, ed)
            total_revenue = sum(s.revenue for s in sales)
            total_cost = sum(s.cost for s in sales)
            return {
                "revenue": round(total_revenue, 2),
                "profit": round(total_revenue - total_cost, 2),
                "orders": len(sales),
            }

        current = await _period_stats(start_date, end_date)

        # Compute prior period of same length for growth %
        prior: dict = {}
        if start_date and end_date:
            delta = (end_date - start_date).days
            prior_end = start_date - timedelta(days=1)
            prior_start = prior_end - timedelta(days=delta)
            prior = await _period_stats(prior_start, prior_end)

        def pct_change(new_val: float, old_val: float) -> Optional[float]:
            if not old_val:
                return None
            return round((new_val - old_val) / old_val * 100, 2)

        avg_order = round(current["revenue"] / current["orders"], 2) if current["orders"] else 0
        margin = round(current["profit"] / current["revenue"] * 100, 2) if current["revenue"] else 0

        return {
            "total_revenue": current["revenue"],
            "total_orders": current["orders"],
            "avg_order_value": avg_order,
            "total_profit": current["profit"],
            "profit_margin_pct": margin,
            "revenue_growth_pct": pct_change(current["revenue"], prior.get("revenue", 0)),
            "orders_growth_pct": pct_change(current["orders"], prior.get("orders", 0)),
        }

    # ── Monthly trend ─────────────────────────────────────────────────────────

    async def get_monthly_revenue(self, months: int = 24) -> List[dict]:
        """
        Return revenue + profit + order count per calendar month.
        Looks back `months` months from the latest sale in the DB
        (not from today) so demo data with historical dates always shows.
        """
        _, db_max = await self._date_bounds()
        if db_max is None:
            return []

        # Anchor cutoff to latest data date, not wall-clock today
        anchor = db_max.replace(day=1)
        # Go back `months-1` months from the anchor month
        year = anchor.year
        mon = anchor.month
        for _ in range(months - 1):
            mon -= 1
            if mon == 0:
                mon = 12
                year -= 1
        cutoff = date(year, mon, 1)

        sales = await self._load_sales(start_date=cutoff)

        agg: dict = defaultdict(lambda: {"revenue": 0.0, "profit": 0.0, "orders": 0})
        for s in sales:
            key = s.sale_date.strftime("%Y-%m")
            agg[key]["revenue"] += s.revenue
            agg[key]["profit"] += s.profit
            agg[key]["orders"] += 1

        return [
            {
                "month": k,
                "revenue": round(v["revenue"], 2),
                "profit": round(v["profit"], 2),
                "orders": v["orders"],
            }
            for k, v in sorted(agg.items())
        ]

    # ── Top products ──────────────────────────────────────────────────────────

    async def get_top_products(
        self,
        limit: int = 10,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[dict]:
        """Rank products by total revenue."""
        sales = await self._load_sales(start_date, end_date)
        products = await self._load_products()

        agg: dict = defaultdict(lambda: {"revenue": 0.0, "units": 0, "cost": 0.0})
        for s in sales:
            agg[s.product_id]["revenue"] += s.revenue
            agg[s.product_id]["units"] += s.quantity
            agg[s.product_id]["cost"] += s.cost

        rows = []
        for pid, vals in agg.items():
            p = products.get(pid)
            if not p:
                continue
            margin = round((vals["revenue"] - vals["cost"]) / vals["revenue"] * 100, 2) if vals["revenue"] else 0
            rows.append({
                "product_id": pid,
                "product_name": p.name,
                "category": p.category,
                "total_revenue": round(vals["revenue"], 2),
                "total_units": vals["units"],
                "profit_margin_pct": margin,
            })

        rows.sort(key=lambda x: x["total_revenue"], reverse=True)
        return rows[:limit]

    # ── Region performance ────────────────────────────────────────────────────

    async def get_region_performance(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[dict]:
        sales = await self._load_sales(start_date, end_date)
        customers = await self._load_customers()

        agg: dict = defaultdict(lambda: {"revenue": 0.0, "orders": 0, "customers": set()})
        for s in sales:
            cust = customers.get(s.customer_id)
            if not cust:
                continue
            agg[cust.region]["revenue"] += s.revenue
            agg[cust.region]["orders"] += 1
            agg[cust.region]["customers"].add(s.customer_id)

        return [
            {
                "region": region,
                "total_revenue": round(vals["revenue"], 2),
                "total_orders": vals["orders"],
                "customer_count": len(vals["customers"]),
            }
            for region, vals in sorted(agg.items(), key=lambda x: -x[1]["revenue"])
        ]

    # ── Customer LTV by segment ───────────────────────────────────────────────

    async def get_customer_ltv(self) -> List[dict]:
        """Average lifetime value grouped by customer segment."""
        sales = await self._load_sales()
        customers = await self._load_customers()

        cust_spend: dict = defaultdict(float)
        cust_orders: dict = defaultdict(int)
        for s in sales:
            cust_spend[s.customer_id] += s.revenue
            cust_orders[s.customer_id] += 1

        seg_data: dict = defaultdict(lambda: {"spend": [], "orders": []})
        for cid, spend in cust_spend.items():
            c = customers.get(cid)
            if c:
                seg_data[c.customer_segment.value]["spend"].append(spend)
                seg_data[c.customer_segment.value]["orders"].append(cust_orders[cid])

        result = []
        for seg, vals in seg_data.items():
            avg_ltv = round(float(np.mean(vals["spend"])), 2) if vals["spend"] else 0
            avg_orders = round(float(np.mean(vals["orders"])), 2) if vals["orders"] else 0
            avg_aov = round(avg_ltv / avg_orders, 2) if avg_orders else 0
            result.append({
                "segment": seg,
                "avg_ltv": avg_ltv,
                "customer_count": len(vals["spend"]),
                "avg_orders": avg_orders,
                "avg_order_value": avg_aov,
            })
        return sorted(result, key=lambda x: -x["avg_ltv"])

    # ── Sales forecast (Linear Regression) ───────────────────────────────────

    async def get_forecast(self, forecast_months: int = 3) -> List[dict]:
        """
        Simple linear regression on monthly revenue to forecast N months ahead.
        Returns historical actuals plus forecast points with confidence intervals.
        Anchors to the last data point, not today's date.
        """
        from sklearn.linear_model import LinearRegression

        monthly = await self.get_monthly_revenue(months=36)
        if len(monthly) < 6:
            return monthly

        revenues = np.array([m["revenue"] for m in monthly])
        x = np.arange(len(revenues)).reshape(-1, 1)

        model = LinearRegression()
        model.fit(x, revenues)

        # Residual std for confidence interval approximation
        y_pred = model.predict(x)
        residuals = revenues - y_pred
        std = float(np.std(residuals))
        z = 1.96  # 95% CI

        result = [
            {**m, "is_forecast": False, "lower_bound": None, "upper_bound": None}
            for m in monthly
        ]

        # Project forward from the last actual month in the data
        last_month_str = monthly[-1]["month"]
        year, mon = map(int, last_month_str.split("-"))

        for i in range(1, forecast_months + 1):
            mon += 1
            if mon > 12:
                mon = 1
                year += 1
            future_x = np.array([[len(revenues) + i - 1]])
            pred = float(model.predict(future_x)[0])
            pred = max(pred, 0)
            result.append({
                "month": f"{year}-{mon:02d}",
                "revenue": round(pred, 2),
                "profit": round(pred * 0.28, 2),
                "orders": 0,
                "is_forecast": True,
                "lower_bound": round(max(pred - z * std, 0), 2),
                "upper_bound": round(pred + z * std, 2),
            })

        return result

    # ── Heatmap: weekday vs month ─────────────────────────────────────────────

    async def get_sales_heatmap(self) -> List[dict]:
        """
        Aggregate revenue by weekday (0=Mon) × month (1-12).
        Returns a flat list suitable for recharts heatmap rendering.
        """
        sales = await self._load_sales()

        grid: dict = defaultdict(float)
        for s in sales:
            dow = s.sale_date.weekday()   # 0=Mon
            mon = s.sale_date.month - 1  # 0-indexed
            grid[(dow, mon)] += s.revenue

        rows = []
        for dow in range(7):
            for mon in range(12):
                rows.append({
                    "weekday": WEEKDAYS[dow],
                    "month": MONTHS[mon],
                    "value": round(grid.get((dow, mon), 0), 2),
                })
        return rows

    # ── RFM Analysis ──────────────────────────────────────────────────────────

    async def get_rfm_analysis(self) -> List[dict]:
        """
        Recency-Frequency-Monetary analysis with quintile scoring.
        Each customer gets an RFM score 1-5 per dimension (5 = best).
        Recency is measured from the last sale in the DB, not wall-clock today,
        so demo data always shows meaningful recency deltas.
        """
        _, db_max = await self._date_bounds()
        today = db_max or date.today()

        sales = await self._load_sales()
        customers = await self._load_customers()

        cust_data: dict = defaultdict(lambda: {"dates": [], "revenue": 0.0})
        for s in sales:
            cust_data[s.customer_id]["dates"].append(s.sale_date)
            cust_data[s.customer_id]["revenue"] += s.revenue

        records = []
        for cid, vals in cust_data.items():
            c = customers.get(cid)
            if not c:
                continue
            recency = (today - max(vals["dates"])).days
            frequency = len(vals["dates"])
            monetary = round(vals["revenue"], 2)
            records.append({
                "customer_id": cid,
                "customer_name": c.name,
                "segment": c.customer_segment.value,
                "recency_days": recency,
                "frequency": frequency,
                "monetary": monetary,
            })

        if not records:
            return []

        r_vals = [x["recency_days"] for x in records]
        f_vals = [x["frequency"] for x in records]
        m_vals = [x["monetary"] for x in records]

        def quintile(val: float, arr: list, reverse: bool = False) -> int:
            pct = sum(1 for v in arr if v <= val) / len(arr)
            score = min(int(pct * 5) + 1, 5)
            return (6 - score) if reverse else score

        for rec in records:
            r_score = quintile(rec["recency_days"], r_vals, reverse=True)
            f_score = quintile(rec["frequency"], f_vals)
            m_score = quintile(rec["monetary"], m_vals)
            rec["rfm_score"] = round((r_score + f_score + m_score) / 3, 2)

        return sorted(records, key=lambda x: -x["rfm_score"])

    # ── Category performance ──────────────────────────────────────────────────

    async def get_category_performance(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[dict]:
        sales = await self._load_sales(start_date, end_date)
        products = await self._load_products()

        agg: dict = defaultdict(lambda: {"revenue": 0.0, "cost": 0.0, "units": 0, "orders": 0})
        for s in sales:
            p = products.get(s.product_id)
            if p:
                agg[p.category]["revenue"] += s.revenue
                agg[p.category]["cost"] += s.cost
                agg[p.category]["units"] += s.quantity
                agg[p.category]["orders"] += 1

        rows = []
        for cat, vals in agg.items():
            margin = round((vals["revenue"] - vals["cost"]) / vals["revenue"] * 100, 2) if vals["revenue"] else 0
            rows.append({
                "category": cat,
                "total_revenue": round(vals["revenue"], 2),
                "total_profit": round(vals["revenue"] - vals["cost"], 2),
                "profit_margin_pct": margin,
                "total_units": vals["units"],
                "total_orders": vals["orders"],
            })

        return sorted(rows, key=lambda x: -x["total_revenue"])
