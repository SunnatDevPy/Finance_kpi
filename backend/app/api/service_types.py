from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models import ServiceType
from app.schemas.service_type import ServiceTypeCreate, ServiceTypeRead, ServiceTypeUpdate
from app.services.helpers import get_service_type_or_404

router = APIRouter(prefix="/service-types", dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ServiceTypeRead])
def list_service_types(
    db: Session = Depends(get_db),
    active_only: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> list[ServiceType]:
    stmt = select(ServiceType).order_by(ServiceType.name)
    if active_only:
        stmt = stmt.where(ServiceType.is_active.is_(True))
    return list(db.scalars(stmt.offset(skip).limit(limit)).all())


@router.post("", response_model=ServiceTypeRead, status_code=status.HTTP_201_CREATED)
def create_service_type(
    payload: ServiceTypeCreate, db: Session = Depends(get_db)
) -> ServiceType:
    existing = db.scalars(
        select(ServiceType).where(ServiceType.name == payload.name)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu nomdagi xizmat turi allaqachon mavjud",
        )

    service_type = ServiceType(**payload.model_dump())
    db.add(service_type)
    db.commit()
    db.refresh(service_type)
    return service_type


@router.get("/{service_type_id}", response_model=ServiceTypeRead)
def get_service_type(service_type_id: int, db: Session = Depends(get_db)) -> ServiceType:
    return get_service_type_or_404(db, service_type_id)


@router.patch("/{service_type_id}", response_model=ServiceTypeRead)
def update_service_type(
    service_type_id: int, payload: ServiceTypeUpdate, db: Session = Depends(get_db)
) -> ServiceType:
    service_type = get_service_type_or_404(db, service_type_id)
    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] != service_type.name:
        existing = db.scalars(
            select(ServiceType).where(ServiceType.name == data["name"])
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu nomdagi xizmat turi allaqachon mavjud",
            )

    for field, value in data.items():
        setattr(service_type, field, value)
    db.commit()
    db.refresh(service_type)
    return service_type


@router.delete("/{service_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_type(service_type_id: int, db: Session = Depends(get_db)) -> None:
    service_type = get_service_type_or_404(db, service_type_id)
    if service_type.line_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kontraktlarda ishlatilgan xizmat turini o'chirib bo'lmaydi",
        )
    db.delete(service_type)
    db.commit()
