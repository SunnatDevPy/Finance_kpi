import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ClientStatus(str, enum.Enum):
    FAOL = "faol"
    NOFAOL = "nofaol"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MENEJER = "menejer"


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = (
        Index("ix_clients_status", "status"),
        Index("ix_clients_company_name", "company_name"),
        Index("ix_clients_city", "city"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    website: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str | None] = mapped_column(String(100))
    activity_type: Mapped[str | None] = mapped_column(String(150))
    status: Mapped[ClientStatus] = mapped_column(
        Enum(
            ClientStatus,
            name="client_status",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        default=ClientStatus.FAOL,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    contracts: Mapped[list["Contract"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )


class ServiceType(Base):
    __tablename__ = "service_types"
    __table_args__ = (Index("ix_service_types_name", "name", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    line_items: Mapped[list["ContractLineItem"]] = relationship(
        back_populates="service_type"
    )


class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = (
        Index("ix_contracts_client_id", "client_id"),
        Index("ix_contracts_start_date", "start_date"),
        Index("ix_contracts_end_date", "end_date"),
        Index("ix_contracts_dates", "start_date", "end_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    contract_number: Mapped[str | None] = mapped_column(String(50))
    invoice_number: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    client: Mapped["Client"] = relationship(back_populates="contracts")
    line_items: Mapped[list["ContractLineItem"]] = relationship(
        back_populates="contract",
        cascade="all, delete-orphan",
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="contract",
        cascade="all, delete-orphan",
    )

    @property
    def total_amount(self) -> Decimal:
        return sum(
            (item.price for item in self.line_items if not item.is_cancelled),
            Decimal("0"),
        )

    @property
    def paid_amount(self) -> Decimal:
        return sum((payment.amount for payment in self.payments), Decimal("0"))

    @property
    def debt_amount(self) -> Decimal:
        return self.total_amount - self.paid_amount

    @property
    def is_cancelled(self) -> bool:
        """True when every line item on the contract has been cancelled."""
        return bool(self.line_items) and all(item.is_cancelled for item in self.line_items)


class ContractLineItem(Base):
    __tablename__ = "contract_line_items"
    __table_args__ = (
        Index("ix_contract_line_items_contract_id", "contract_id"),
        Index("ix_contract_line_items_service_type_id", "service_type_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    contract_id: Mapped[int] = mapped_column(
        ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False
    )
    service_type_id: Mapped[int] = mapped_column(
        ForeignKey("service_types.id", ondelete="RESTRICT"), nullable=False
    )
    price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    is_cancelled: Mapped[bool] = mapped_column(default=False, nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    contract: Mapped["Contract"] = relationship(back_populates="line_items")
    service_type: Mapped["ServiceType"] = relationship(back_populates="line_items")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_contract_id", "contract_id"),
        Index("ix_payments_paid_at", "paid_at"),
        Index("ix_payments_contract_paid_at", "contract_id", "paid_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    contract_id: Mapped[int] = mapped_column(
        ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    paid_at: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    contract: Mapped["Contract"] = relationship(back_populates="payments")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_username", "username", unique=True),
        Index("ix_users_role", "role"),
        Index("ix_users_is_active", "is_active"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        default=UserRole.MENEJER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
