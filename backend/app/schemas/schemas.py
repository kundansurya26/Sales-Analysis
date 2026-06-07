"""
Pydantic v2 schemas for request validation and response serialization.
Separate Input (create/update) from Output (response) schemas.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Product ───────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    unit_price: float = Field(gt=0)
    cost_price: float = Field(gt=0)
    description: Optional[str] = None

    @model_validator(mode="after")
    def cost_less_than_price(self) -> "ProductCreate":
        if self.cost_price >= self.unit_price:
            raise ValueError("cost_price must be less than unit_price")
        return self


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    unit_price: Optional[float] = Field(None, gt=0)
    cost_price: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: int
    name: str
    category: str
    unit_price: float
    cost_price: float
    description: Optional[str]
    is_active: bool
    margin_pct: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Customer ──────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    region: str = Field(min_length=1, max_length=100)
    customer_segment: str = Field(default="Bronze", pattern="^(Gold|Silver|Bronze)$")
    join_date: date
    phone: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    region: Optional[str] = None
    customer_segment: Optional[str] = Field(None, pattern="^(Gold|Silver|Bronze)$")
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerOut(BaseModel):
    id: int
    name: str
    email: str
    region: str
    customer_segment: str
    join_date: date
    phone: Optional[str]
    is_active: bool

    model_config = {"from_attributes": True}


# ── Employee ──────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    role: str = Field(min_length=1, max_length=100)
    department: str = Field(min_length=1, max_length=100)
    hire_date: date
    manager_id: Optional[int] = None
    salary: float = Field(gt=0)


class EmployeeOut(BaseModel):
    id: int
    name: str
    role: str
    department: str
    hire_date: date
    manager_id: Optional[int]
    salary: float
    is_active: bool

    model_config = {"from_attributes": True}


# ── Sale ──────────────────────────────────────────────────────────────────────

class SaleCreate(BaseModel):
    product_id: int = Field(gt=0)
    customer_id: int = Field(gt=0)
    quantity: int = Field(gt=0)
    sale_date: date
    discount_percent: float = Field(ge=0, le=100, default=0.0)


class SaleUpdate(BaseModel):
    quantity: Optional[int] = Field(None, gt=0)
    discount_percent: Optional[float] = Field(None, ge=0, le=100)
    sale_date: Optional[date] = None


class SaleOut(BaseModel):
    id: int
    product_id: int
    customer_id: int
    quantity: int
    sale_date: date
    discount_percent: float
    unit_price_at_sale: float
    cost_price_at_sale: float
    revenue: float
    profit: float
    product: Optional[ProductOut] = None
    customer: Optional[CustomerOut] = None

    model_config = {"from_attributes": True}


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Analytics ─────────────────────────────────────────────────────────────────

class KPIResponse(BaseModel):
    total_revenue: float
    total_orders: int
    avg_order_value: float
    total_profit: float
    profit_margin_pct: float
    revenue_growth_pct: Optional[float]  # vs previous period
    orders_growth_pct: Optional[float]


class MonthlyRevenue(BaseModel):
    month: str  # "2024-01"
    revenue: float
    profit: float
    orders: int


class TopProduct(BaseModel):
    product_id: int
    product_name: str
    category: str
    total_revenue: float
    total_units: int
    profit_margin_pct: float


class RegionPerformance(BaseModel):
    region: str
    total_revenue: float
    total_orders: int
    customer_count: int


class CustomerLTV(BaseModel):
    segment: str
    avg_ltv: float
    customer_count: int
    avg_orders: float
    avg_order_value: float


class ForecastPoint(BaseModel):
    month: str
    predicted_revenue: float
    lower_bound: float
    upper_bound: float
    is_forecast: bool


class RFMRecord(BaseModel):
    customer_id: int
    customer_name: str
    segment: str
    recency_days: int
    frequency: int
    monetary: float
    rfm_score: float


class HeatmapCell(BaseModel):
    weekday: str
    month: str
    value: float
