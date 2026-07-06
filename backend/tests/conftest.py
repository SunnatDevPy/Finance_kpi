import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.limiter import limiter
from app.main import app
from app.models import AppSetting, Client, ClientStatus, Contract, ContractLineItem, ServiceType, User, UserRole
from app.services.app_settings import MONTHLY_PLAN_KEY
from app.services.auth import hash_password

limiter.enabled = False


@pytest.fixture(autouse=True)
def _isolate_uploads(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path / "uploads"))
    yield

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    limiter.enabled = False
    storage = getattr(limiter, "_storage", None)
    if storage is not None and hasattr(storage, "reset"):
        storage.reset()
    yield
    limiter.enabled = False
    if storage is not None and hasattr(storage, "reset"):
        storage.reset()


@pytest.fixture
def db_session():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session):
    user = User(
        username="admin",
        full_name="Test Admin",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, admin_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_client(db_session):
    client = Client(company_name="Acme LLC", status=ClientStatus.FAOL, city="Toshkent")
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    return client


@pytest.fixture
def sample_service_type(db_session):
    service = ServiceType(name="Marketing", is_active=True)
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


@pytest.fixture
def sample_contract(db_session, sample_client, sample_service_type):
    from datetime import date
    from decimal import Decimal

    contract = Contract(
        client_id=sample_client.id,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
    )
    contract.line_items = [
        ContractLineItem(
            service_type_id=sample_service_type.id,
            price=Decimal("1000000.00"),
        )
    ]
    db_session.add(contract)
    db_session.commit()
    db_session.refresh(contract)
    return contract


@pytest.fixture
def app_settings(db_session):
    db_session.add(AppSetting(key=MONTHLY_PLAN_KEY, value="50000000"))
    db_session.commit()
