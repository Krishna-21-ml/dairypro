from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.database import connect_db, disconnect_db
from app.middleware.error_handler import error_handler_middleware
from app.api.routes import (
    auth, users, farmers, milk_entries, milk_prices,
    debt, inventory, reports, dashboard, notifications, ai_placeholder
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title="Dairy Management System API",
    description="Production-ready Dairy Management SaaS Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.middleware("http")(error_handler_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(farmers.router, prefix="/api/farmers", tags=["Farmers"])
app.include_router(milk_entries.router, prefix="/api/milk-entries", tags=["Milk Entries"])
app.include_router(milk_prices.router, prefix="/api/milk-prices", tags=["Milk Prices"])
app.include_router(debt.router, prefix="/api/debt", tags=["Debt Management"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(ai_placeholder.router, prefix="/api/ai", tags=["AI (Future)"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
