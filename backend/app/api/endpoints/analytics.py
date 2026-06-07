"""
Analytics endpoints — all require authentication.
Heavy computations are delegated to AnalyticsService.
"""
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.services.analytics import AnalyticsService

router = APIRouter()


def _service(db: AsyncSession = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)


@router.get("/kpis")
async def get_kpis(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    svc: AnalyticsService = Depends(_service),
    _: User = Depends(get_current_user),
):
    """KPI cards: revenue, orders, AOV, profit margin with period-over-period growth."""
    return await svc.get_kpis(start_date, end_date)


@router.get("/monthly-revenue")
async def monthly_revenue(
    months: int = Query(24, ge=3, le=60),
    svc: AnalyticsService = Depends(_service),
    _: User = Depends(get_current_user),
):
    """Revenue + profit + orders by calendar month."""
    return await svc.get_monthly_revenue(months)


@router.get("/top-products")
async def top_products(
    limit: int = Query(10, ge=1, le=50),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    svc: AnalyticsService = Depends(_service),
    _: User = Depends(get_current_user),
):
    """Top N products by total revenue."""
    return await svc.get_top_products(limit, start_date, end_date)


@router.get("/region-performance")
async def region_performance(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    svc: AnalyticsService = Depends(_service),
    _: User = Depends(get_current_user),
):
    """Revenue, orders and unique customer count per region."""
    return await svc.get_region_performance(start_date, end_date)


@router.get("/customer-ltv")
async def customer_ltv(
    svc: AnalyticsService = Depends(_service),
    _: User = Depends(get_current_user),
):
    """Average lifetime value by customer segment (Gold / Silver / Bronze)."""
    return await svc.get_customer_ltv()


@router.get("/forecast")
async def forecast(
    forecast_months: int = Query(3, ge=1, le=12),
    svc: AnalyticsService = Depends(_service),
    _: User = Depends(get_current_user),
):
    """Linear regression forecast with 95% confidence interval."""
    return await svc.get_forecast(forecast_months)


@router.get("/heatmap")
async def sales_heatmap(
    svc: AnalyticsService = Depends(_service),
    _: User = Depends(get_current_user),
):
    """Revenue heatmap: weekday × month grid."""
    return await svc.get_sales_heatmap()


@router.get("/rfm")
async def rfm_analysis(
    svc: AnalyticsService = Depends(_service),
    _: User = Depends(get_current_user),
):
    """RFM (Recency / Frequency / Monetary) scoring for all customers."""
    return await svc.get_rfm_analysis()


@router.get("/category-performance")
async def category_performance(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    svc: AnalyticsService = Depends(_service),
    _: User = Depends(get_current_user),
):
    """Revenue, profit and margin per product category."""
    return await svc.get_category_performance(start_date, end_date)
