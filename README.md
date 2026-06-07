# SalesDash — Production-Ready Sales Analytics Dashboard

A full-stack sales analytics platform built as a data analyst portfolio project.
JWT-authenticated, dark-mode-ready, with real-time KPIs, forecasting, and RFM analysis.

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | FastAPI 0.115 + SQLAlchemy 2 (async) |
| Database   | SQLite (dev) / PostgreSQL (prod) |
| Auth       | JWT (access + refresh tokens) via `python-jose` |
| ML         | scikit-learn linear regression for forecasting |
| Frontend   | React 18 + TypeScript + Vite |
| Styling    | Tailwind CSS v3 (dark mode) |
| Charts     | Recharts |
| State      | Zustand |
| HTTP       | Axios with auto token-refresh interceptor |
| Container  | Docker + docker-compose |

---

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp .env.example .env          # Edit SECRET_KEY at minimum

# 2. Build and start everything (API + Frontend + auto-seed)
docker-compose up --build

# 3. Open the app
open http://localhost          # Frontend (Nginx)
open http://localhost:8000/api/docs  # Swagger UI
```

The `seeder` service runs automatically once after the backend is healthy,
populating the database with 50 products, 100 customers, 20 employees and ~1 800 sales.

---

## Local Development (no Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp ../.env.example .env
python seed.py                         # Seed the SQLite database
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs

### Frontend

```bash
cd frontend
npm install
npm run dev                            # http://localhost:3000
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`.

---

## Demo Credentials

| Role   | Email                    | Password    |
|--------|--------------------------|-------------|
| Admin  | admin@example.com        | Admin123!   |
| Viewer | viewer@example.com       | Viewer123!  |

Admins can create/update/delete records. Viewers have read-only access.

---

## Project Structure

```
sales-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, middleware, routers
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic settings (env vars)
│   │   │   ├── security.py       # bcrypt hashing, JWT creation/decode
│   │   │   └── logging.py        # Structured JSON logging
│   │   ├── db/
│   │   │   └── session.py        # Async engine, session factory, Base
│   │   ├── models/
│   │   │   └── models.py         # SQLAlchemy ORM: User, Product, Customer, Sale, Employee
│   │   ├── schemas/
│   │   │   └── schemas.py        # Pydantic v2 request/response schemas
│   │   ├── services/
│   │   │   └── analytics.py      # All analytics logic (KPIs, RFM, forecast, heatmap)
│   │   └── api/
│   │       ├── deps.py           # Auth dependencies (get_current_user, require_admin)
│   │       └── endpoints/
│   │           ├── auth.py       # POST /login, /refresh, /logout, GET /me
│   │           ├── sales.py      # CRUD + CSV export
│   │           ├── analytics.py  # KPIs, top products, regions, forecast, RFM, heatmap
│   │           ├── products.py   # Product CRUD
│   │           ├── customers.py  # Customer CRUD
│   │           ├── employees.py  # Employee CRUD
│   │           └── dashboard.py  # Aggregated summary (single round-trip)
│   ├── tests/
│   │   └── test_core.py          # pytest: security + analytics (7 tests)
│   ├── seed.py                   # Realistic data generator (Faker)
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/client.ts         # Axios + auto-refresh interceptor
│   │   ├── context/
│   │   │   ├── authStore.ts      # Zustand auth state
│   │   │   └── themeStore.ts     # Zustand dark/light theme
│   │   ├── types/index.ts        # TypeScript interfaces for all models
│   │   ├── utils/format.ts       # Currency/date formatters, colour palettes
│   │   ├── components/
│   │   │   ├── ui/               # Card, KPICard, Badge, Skeleton, Button, Input
│   │   │   ├── charts/           # RevenueTrend, TopProducts, RegionPie, Forecast, Heatmap
│   │   │   └── layout/           # Sidebar, AppLayout
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── DashboardPage.tsx  # KPIs + revenue trend + top products + pie + heatmap
│   │       ├── SalesPage.tsx      # Paginated table + CSV export + category chart
│   │       ├── ProductsPage.tsx   # Scatter matrix + category bar + product table
│   │       ├── CustomersPage.tsx  # RFM table + LTV bar + segment radar
│   │       └── ForecastingPage.tsx# Forecast chart + confidence intervals + detail table
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Reference

Full interactive docs: http://localhost:8000/api/docs

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Email + password → token pair |
| POST | `/api/auth/refresh` | Refresh token → new token pair |
| POST | `/api/auth/logout` | Invalidate session (client-side) |
| GET  | `/api/auth/me` | Current user profile |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/kpis` | Revenue, orders, AOV, margin + growth % |
| GET | `/api/analytics/monthly-revenue` | Monthly revenue + profit trend |
| GET | `/api/analytics/top-products` | Top N products by revenue |
| GET | `/api/analytics/region-performance` | Revenue per region |
| GET | `/api/analytics/customer-ltv` | LTV by Gold/Silver/Bronze segment |
| GET | `/api/analytics/forecast` | Linear regression forecast with CI |
| GET | `/api/analytics/heatmap` | Revenue by weekday × month |
| GET | `/api/analytics/rfm` | RFM scoring for all customers |
| GET | `/api/analytics/category-performance` | Revenue/profit per category |

All analytics endpoints accept optional `start_date` / `end_date` query params (`YYYY-MM-DD`).

### CRUD Endpoints
`/api/sales/`, `/api/products/`, `/api/customers/`, `/api/employees/`
— Standard REST: GET (list + single), POST, PATCH, DELETE.  
Write operations require Admin role.

### CSV Export
`GET /api/sales/export/csv` — streams a CSV of the current filter selection.

---

## Switching to PostgreSQL

1. Update `.env`:
   ```
   DATABASE_URL=postgresql+asyncpg://user:password@host:5432/salesdash
   ```
2. Add `asyncpg` to requirements (already included).
3. Run `python seed.py` to populate.
4. For schema migrations use Alembic (`alembic upgrade head`).

---

## Running Tests

```bash
cd backend
pytest tests/ -v
# 7 passed: password hashing, JWT round-trip, token types, invalid token, 3× async analytics
```

---

## Environment Variables

See `.env.example` for the full list. Required in production:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | ≥32-char random string for JWT signing (`openssl rand -hex 32`) |
| `DATABASE_URL` | SQLAlchemy async URL |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin credentials |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
