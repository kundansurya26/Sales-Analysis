"""
Unit tests for security utilities and analytics service.
Run: pytest tests/ -v
"""
import pytest

from app.core.security import (
    create_access_token, create_refresh_token,
    decode_token, get_password_hash, verify_password,
)


# ── Security tests ────────────────────────────────────────────────────────────

def test_password_hashing():
    """Bcrypt round-trip: hash then verify (password ≤72 bytes for bcrypt)."""
    password = "SecureP@ssw0rd!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert hashed.startswith("$2b$")  # bcrypt signature
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)


def test_access_token_round_trip():
    """Access token encodes user ID and decodes correctly."""
    token = create_access_token(subject=42, extra_claims={"role": "admin"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["type"] == "access"
    assert payload["role"] == "admin"


def test_refresh_token_type():
    """Refresh token has type='refresh'."""
    token = create_refresh_token(subject=7)
    payload = decode_token(token)
    assert payload is not None
    assert payload["type"] == "refresh"
    assert payload["sub"] == "7"


def test_invalid_token_returns_none():
    """Tampered or empty token must return None."""
    assert decode_token("not.a.valid.token") is None
    assert decode_token("") is None


# ── Analytics service tests (in-memory SQLite) ────────────────────────────────

@pytest.mark.asyncio
async def test_kpi_empty_db():
    """KPIs on empty database return zeros without crashing."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.db.session import Base
    from app.services.analytics import AnalyticsService

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with Session() as db:
        svc = AnalyticsService(db)
        kpis = await svc.get_kpis()
        assert kpis["total_revenue"] == 0
        assert kpis["total_orders"] == 0
        assert kpis["avg_order_value"] == 0
        assert kpis["profit_margin_pct"] == 0

    await engine.dispose()


@pytest.mark.asyncio
async def test_rfm_empty_db():
    """RFM analysis on empty DB returns empty list."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.db.session import Base
    from app.services.analytics import AnalyticsService

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with Session() as db:
        svc = AnalyticsService(db)
        result = await svc.get_rfm_analysis()
        assert result == []

    await engine.dispose()


@pytest.mark.asyncio
async def test_category_performance_empty_db():
    """Category performance on empty DB returns empty list."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.db.session import Base
    from app.services.analytics import AnalyticsService

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with Session() as db:
        svc = AnalyticsService(db)
        result = await svc.get_category_performance()
        assert result == []

    await engine.dispose()
