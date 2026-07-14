from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models import AuditAction, User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.audit import diff_fields, record_audit
from app.services.auth import hash_password

router = APIRouter(prefix="/users", dependencies=[Depends(require_admin)])


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.full_name)).all())


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> User:
    existing = db.scalars(select(User).where(User.username == payload.username)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu login allaqachon mavjud",
        )

    user = User(
        username=payload.username,
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    record_audit(
        db,
        user=current_user,
        entity_type="user",
        entity_id=user.id,
        action=AuditAction.CREATE,
        summary=f"Yangi hodim yaratildi: {user.full_name} ({user.username}), rol: {user.role.value}",
    )
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hodim topilmadi")

    data = payload.model_dump(exclude_unset=True)
    if user_id == current_user.id and data.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O'zingizni bloklab bo'lmaydi",
        )

    before = {
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
    }

    if "password" in data:
        user.password_hash = hash_password(data.pop("password"))
        password_changed = True
    else:
        password_changed = False

    for field, value in data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    after = {
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
    }
    changes = diff_fields(before, after)
    if password_changed:
        changes["password"] = ("***", "***")
    if changes:
        record_audit(
            db,
            user=current_user,
            entity_type="user",
            entity_id=user.id,
            action=AuditAction.UPDATE,
            changes=changes,
            summary=f"Hodim ma'lumotlari o'zgartirildi: {user.full_name} ({user.username})",
        )
    return user
