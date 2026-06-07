"""Dashboard endpoint — returns all KPI data in a single round trip."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.services.analytics import AnalyticsService

router = APIRouter()


@router.get("/summary")
async def dashboard_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Single endpoint that returns all data needed by the dashboard page.
    Reduces frontend round trips from 5 to 1.
    """
    svc = AnalyticsService(db)
    kpis, monthly, top_products, regions = await _gather(svc, start_date, end_date)
    return {
        "kpis": kpis,
        "monthly_revenue": monthly,
        "top_products": top_products,
        "region_performance": regions,
    }


async def _gather(svc, start_date, end_date):
    """Run analytics queries concurrently using asyncio.gather."""
    import asyncio
    return await asyncio.gather(
        svc.get_kpis(start_date, end_date),
        svc.get_monthly_revenue(12),
        svc.get_top_products(10, start_date, end_date),
        svc.get_region_performance(start_date, end_date),
    )
