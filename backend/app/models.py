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


class ContractWorkflowStatus(str, enum.Enum):
    YANGI = "yangi"
    DAVOM_ETMOQDA = "davom_etmoqda"
    TUGADI = "tugadi"
    TOXTATILDI = "toxtatildi"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MENEJER = "menejer"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    RESTORE = "restore"


class ExpenseCategory(str, enum.Enum):
    SALARY = "salary"
    RENT = "rent"
    MARKETING = "marketing"
    UTILITIES = "utilities"
    TRANSPORT = "transport"
    OFFICE = "office"
    TAX = "tax"
    BANK_FEE = "bank_fee"
    OTHER = "other"


class IncomeCategory(str, enum.Enum):
    """Shartnomaga bog'liq bo'lmagan kirim turlari (mijoz to'lovlari — Payment orqali)."""

    SALE = "sale"
    SERVICE = "service"
    INVESTMENT = "investment"
    LOAN = "loan"
    GRANT = "grant"
    REFUND = "refund"
    OTHER = "other"


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
    logo_path: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    contracts: Mapped[list["Contract"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )

    @property
    def logo_url(self) -> str | None:
        if not self.logo_path:
            return None
        return f"/api/v1/uploads/client_logos/{self.logo_path}"


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
    status: Mapped[ContractWorkflowStatus] = mapped_column(
        Enum(
            ContractWorkflowStatus,
            name="contract_workflow_status",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        default=ContractWorkflowStatus.YANGI,
        server_default=ContractWorkflowStatus.YANGI.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

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
        return sum(
            (payment.amount for payment in self.payments if payment.deleted_at is None),
            Decimal("0"),
        )

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
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    contract: Mapped["Contract"] = relationship(back_populates="payments")


class Expense(Base):
    """Operational cost (salary, rent, marketing, ...) — the cost side of the P&L."""

    __tablename__ = "expenses"
    __table_args__ = (
        Index("ix_expenses_category", "category"),
        Index("ix_expenses_expense_date", "expense_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(
            ExpenseCategory,
            name="expense_category",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Income(Base):
    """Shartnomaga bog'liq bo'lmagan kirim (investitsiya, kredit, boshqa daromad, ...) —
    mijozdan shartnoma bo'yicha kelgan pul `Payment` orqali hisoblanadi, bu esa faqat
    "boshqa kirimlar" uchun."""

    __tablename__ = "incomes"
    __table_args__ = (
        Index("ix_incomes_category", "category"),
        Index("ix_incomes_income_date", "income_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[IncomeCategory] = mapped_column(
        Enum(
            IncomeCategory,
            name="income_category",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    income_date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


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

    login_history: Mapped[list["LoginHistory"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
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


class LoginHistory(Base):
    __tablename__ = "login_history"
    __table_args__ = (
        Index("ix_login_history_user_id", "user_id"),
        Index("ix_login_history_logged_in_at", "logged_in_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    logged_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="login_history")


class AuditLog(Base):
    """Immutable record of who changed what on core financial entities."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_created_at", "created_at"),
        Index("ix_audit_logs_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int] = mapped_column(nullable=False)
    action: Mapped[AuditAction] = mapped_column(
        Enum(
            AuditAction,
            name="audit_action",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )
    summary: Mapped[str | None] = mapped_column(String(500))
    changes: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    username: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
