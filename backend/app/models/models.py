"""
SQLAlchemy ORM models for the sales dashboard.
All models inherit from Base and use Python type annotations.
"""
from __future__ import annotations

import enum
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, Float, ForeignKey,
    Integer, Numeric, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

class CustomerSegment(str, enum.Enum):
    GOLD = "Gold"
    SILVER = "Silver"
    BRONZE = "Bronze"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    VIEWER = "viewer"


# ── User (Auth) ───────────────────────────────────────────────────────────────

class User(Base):
    """Application user with role-based access control."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Product ───────────────────────────────────────────────────────────────────

class Product(Base):
    """Product catalogue with pricing information."""
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sales: Mapped[List["Sale"]] = relationship("Sale", back_populates="product")

    @property
    def margin_pct(self) -> float:
        """Gross margin percentage."""
        if self.unit_price == 0:
            return 0.0
        return round((float(self.unit_price) - float(self.cost_price)) / float(self.unit_price) * 100, 2)


# ── Customer ──────────────────────────────────────────────────────────────────

class Customer(Base):
    """Customer record with segmentation and regional data."""
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    region: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    customer_segment: Mapped[CustomerSegment] = mapped_column(
        Enum(CustomerSegment), default=CustomerSegment.BRONZE, nullable=False
    )
    join_date: Mapped[date] = mapped_column(Date, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    sales: Mapped[List["Sale"]] = relationship("Sale", back_populates="customer")


# ── Employee ──────────────────────────────────────────────────────────────────

class Employee(Base):
    """Employee with self-referential manager hierarchy."""
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    manager_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("employees.id"), nullable=True
    )
    salary: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=50000)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Self-referential relationship
    manager: Mapped[Optional["Employee"]] = relationship(
        "Employee", remote_side="Employee.id", back_populates="reports"
    )
    reports: Mapped[List["Employee"]] = relationship("Employee", back_populates="manager")


# ── Sale ──────────────────────────────────────────────────────────────────────

class Sale(Base):
    """
    Core sales transaction table.
    Revenue = quantity * unit_price * (1 - discount_percent/100)
    Profit  = Revenue - quantity * cost_price
    """
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Denormalized for query performance (kept in sync by service layer)
    unit_price_at_sale: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cost_price_at_sale: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="sales")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="sales")

    @property
    def revenue(self) -> float:
        return round(self.quantity * float(self.unit_price_at_sale) * (1 - self.discount_percent / 100), 2)

    @property
    def cost(self) -> float:
        return round(self.quantity * float(self.cost_price_at_sale), 2)

    @property
    def profit(self) -> float:
        return round(self.revenue - self.cost, 2)
