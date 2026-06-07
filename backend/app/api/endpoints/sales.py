"""
Sales CRUD endpoints with date-range filtering, pagination, and CSV export.
"""
import csv
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.models import Customer, Product, Sale, User
from app.schemas.schemas import SaleCreate, SaleOut, SaleUpdate

router = APIRouter()


def _base_query(
    start_date: Optional[date],
    end_date: Optional[date],
    product_id: Optional[int],
    customer_id: Optional[int],
    category: Optional[str],
):
    """Build a filtered base query for sales."""
    q = select(Sale).options(
        selectinload(Sale.product),
        selectinload(Sale.customer),
    )
    if start_date:
        q = q.where(Sale.sale_date >= start_date)
    if end_date:
        q = q.where(Sale.sale_date <= end_date)
    if product_id:
        q = q.where(Sale.product_id == product_id)
    if customer_id:
        q = q.where(Sale.customer_id == customer_id)
    return q


@router.get("/")
async def list_sales(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    product_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    sort_by: str = Query("sale_date", pattern="^(sale_date|revenue|quantity)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Paginated, filtered, sortable list of sales with product + customer detail."""
    q = _base_query(start_date, end_date, product_id, customer_id, None)

    # Count total
    count_q = select(func.count()).select_from(Sale)
    if start_date:
        count_q = count_q.where(Sale.sale_date >= start_date)
    if end_date:
        count_q = count_q.where(Sale.sale_date <= end_date)
    if product_id:
        count_q = count_q.where(Sale.product_id == product_id)
    if customer_id:
        count_q = count_q.where(Sale.customer_id == customer_id)

    total = (await db.execute(count_q)).scalar_one()

    # Sorting
    sort_col = {"sale_date": Sale.sale_date, "quantity": Sale.quantity}.get(sort_by, Sale.sale_date)
    q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    # Pagination
    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    sales = result.scalars().all()

    items = []
    for s in sales:
        items.append({
            "id": s.id,
            "product_id": s.product_id,
            "customer_id": s.customer_id,
            "product_name": s.product.name if s.product else None,
            "customer_name": s.customer.name if s.customer else None,
            "category": s.product.category if s.product else None,
            "region": s.customer.region if s.customer else None,
            "quantity": s.quantity,
            "sale_date": s.sale_date.isoformat(),
            "discount_percent": s.discount_percent,
            "unit_price_at_sale": float(s.unit_price_at_sale),
            "revenue": s.revenue,
            "profit": s.profit,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": -(-total // page_size),  # ceiling division
    }


@router.get("/export/csv")
async def export_csv(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    product_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Stream sales data as a CSV file download."""
    q = _base_query(start_date, end_date, product_id, customer_id, None)
    result = await db.execute(q)
    sales = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "sale_date", "product_name", "category", "customer_name",
        "region", "segment", "quantity", "unit_price", "discount_pct",
        "revenue", "cost", "profit",
    ])
    for s in sales:
        writer.writerow([
            s.id, s.sale_date,
            s.product.name if s.product else "",
            s.product.category if s.product else "",
            s.customer.name if s.customer else "",
            s.customer.region if s.customer else "",
            s.customer.customer_segment.value if s.customer else "",
            s.quantity, float(s.unit_price_at_sale), s.discount_percent,
            s.revenue, s.cost, s.profit,
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales_export.csv"},
    )


@router.get("/{sale_id}", response_model=SaleOut)
async def get_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Sale).options(selectinload(Sale.product), selectinload(Sale.customer)).where(Sale.id == sale_id)
    result = await db.execute(q)
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale


@router.post("/", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
async def create_sale(
    payload: SaleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Create a new sale. Snapshots current product prices at time of sale."""
    product = await db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    customer = await db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    sale = Sale(
        **payload.model_dump(),
        unit_price_at_sale=product.unit_price,
        cost_price_at_sale=product.cost_price,
    )
    db.add(sale)
    await db.flush()
    await db.refresh(sale)

    q = select(Sale).options(selectinload(Sale.product), selectinload(Sale.customer)).where(Sale.id == sale.id)
    result = await db.execute(q)
    return result.scalar_one()


@router.patch("/{sale_id}", response_model=SaleOut)
async def update_sale(
    sale_id: int,
    payload: SaleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    sale = await db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(sale, field, value)

    await db.flush()
    q = select(Sale).options(selectinload(Sale.product), selectinload(Sale.customer)).where(Sale.id == sale_id)
    result = await db.execute(q)
    return result.scalar_one()


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    sale = await db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await db.delete(sale)
