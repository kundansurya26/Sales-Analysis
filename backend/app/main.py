"""
Sales Analysis Dashboard - FastAPI Application Entry Point
"""
import uuid
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import engine, Base
from app.api.endpoints import auth, sales, analytics, products, customers, dashboard, employees

# Initialize structured logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup
    logger.info("Starting Sales Dashboard API", extra={"version": settings.APP_VERSION})
    # Create all tables (in production, use Alembic migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized")
    yield
    # Shutdown
    logger.info("Shutting down Sales Dashboard API")
    await engine.dispose()


app = FastAPI(
    title="Sales Analysis Dashboard API",
    description="Production-ready sales analytics backend with JWT auth, advanced analytics, and forecasting.",
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Attach a unique request ID to every request for tracing."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()

    response: Response = await call_next(request)

    duration_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{duration_ms}ms"

    logger.info(
        "HTTP request processed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response


# ── Global Exception Handlers ─────────────────────────────────────────────────

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc), "type": "validation_error"})


@app.exception_handler(PermissionError)
async def permission_error_handler(request: Request, exc: PermissionError):
    return JSONResponse(status_code=403, content={"detail": str(exc), "type": "permission_error"})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "Unhandled exception",
        extra={"request_id": request_id, "error": str(exc)},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
    )


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router,       prefix="/api/auth",       tags=["Authentication"])
app.include_router(sales.router,      prefix="/api/sales",      tags=["Sales"])
app.include_router(analytics.router,  prefix="/api/analytics",  tags=["Analytics"])
app.include_router(products.router,   prefix="/api/products",   tags=["Products"])
app.include_router(customers.router,  prefix="/api/customers",  tags=["Customers"])
app.include_router(employees.router,  prefix="/api/employees",  tags=["Employees"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint for container orchestration."""
    return {"status": "healthy", "version": settings.APP_VERSION}
