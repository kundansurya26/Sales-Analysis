"""Employees endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.models import Employee, User
from app.schemas.schemas import EmployeeCreate, EmployeeOut

router = APIRouter()


@router.get("/", response_model=List[EmployeeOut])
async def list_employees(
    department: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Employee)
    if department:
        q = q.where(Employee.department == department)
    result = await db.execute(q.order_by(Employee.name))
    return result.scalars().all()


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    e = await db.get(Employee, employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    return e


@router.post("/", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    employee = Employee(**payload.model_dump())
    db.add(employee)
    await db.flush()
    await db.refresh(employee)
    return employee
