from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.auth import hash_password

router = APIRouter(prefix="/users", dependencies=[Depends(require_admin)])


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.full_name)).all())


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
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
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int, payload: UserUpdate, db: Session = Depends(get_db)
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hodim topilmadi")

    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        user.password_hash = hash_password(data.pop("password"))

    for field, value in data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user
