from fastapi import APIRouter

from app.api.audit import router as audit_router
from app.api.auth import router as auth_router
from app.api.clients import router as clients_router
from app.api.dashboard import router as dashboard_router
from app.api.contracts import router as contracts_router
from app.api.debts import router as debts_router
from app.api.expenses import router as expenses_router
from app.api.export import router as export_router
from app.api.finance import router as finance_router
from app.api.health import router as health_router
from app.api.incomes import router as incomes_router
from app.api.notifications import router as notifications_router
from app.api.payments import router as payments_router
from app.api.settings import router as settings_router
from app.api.service_types import router as service_types_router
from app.api.users import router as users_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(audit_router, tags=["audit"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(dashboard_router, tags=["dashboard"])
api_router.include_router(notifications_router, tags=["notifications"])
api_router.include_router(export_router, tags=["export"])
api_router.include_router(settings_router, tags=["settings"])
api_router.include_router(clients_router, tags=["clients"])
api_router.include_router(service_types_router, tags=["service-types"])
api_router.include_router(contracts_router, tags=["contracts"])
api_router.include_router(debts_router, tags=["debts"])
api_router.include_router(payments_router, tags=["payments"])
api_router.include_router(expenses_router, tags=["expenses"])
api_router.include_router(incomes_router, tags=["incomes"])
api_router.include_router(finance_router, tags=["finance"])
api_router.include_router(users_router, tags=["users"])
