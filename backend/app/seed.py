DEFAULT_SERVICE_TYPES = [
    "Foto",
    "Video",
    "Sayt",
    "SMM",
    "Katalog",
    "Bozor tahlili",
    "Brendbuk",
    "Audit",
    "Dizayn",
    "Sayt tahriri",
]


def seed_service_types() -> None:
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import ServiceType

    db = SessionLocal()
    try:
        existing = set(db.scalars(select(ServiceType.name)).all())
        for name in DEFAULT_SERVICE_TYPES:
            if name not in existing:
                db.add(ServiceType(name=name, is_active=True))
        db.commit()
    finally:
        db.close()


def seed_admin_user() -> None:
    from sqlalchemy import select

    from app.config import settings
    from app.database import SessionLocal
    from app.models import User, UserRole
    from app.services.auth import hash_password

    db = SessionLocal()
    try:
        admin = db.scalars(
            select(User).where(User.username == settings.admin_username)
        ).first()
        if admin is None:
            db.add(
                User(
                    username=settings.admin_username,
                    full_name=settings.admin_full_name,
                    password_hash=hash_password(settings.admin_password),
                    role=UserRole.ADMIN,
                    is_active=True,
                )
            )
            db.commit()
    finally:
        db.close()


def seed_app_settings() -> None:
    from app.config import settings
    from app.database import SessionLocal
    from app.models import AppSetting
    from app.services.app_settings import MONTHLY_PLAN_KEY

    db = SessionLocal()
    try:
        if db.get(AppSetting, MONTHLY_PLAN_KEY) is None:
            db.add(
                AppSetting(
                    key=MONTHLY_PLAN_KEY,
                    value=str(settings.monthly_plan),
                )
            )
            db.commit()
    finally:
        db.close()


def run_seed() -> None:
    seed_service_types()
    seed_admin_user()
    seed_app_settings()


if __name__ == "__main__":
    run_seed()
