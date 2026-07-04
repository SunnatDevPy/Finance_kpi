"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-28

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

client_status = postgresql.ENUM(
    "faol", "nofaol", name="client_status", create_type=False
)


def upgrade() -> None:
    client_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("contact_person", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("activity_type", sa.String(length=150), nullable=True),
        sa.Column("status", client_status, nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clients_status", "clients", ["status"])
    op.create_index("ix_clients_company_name", "clients", ["company_name"])
    op.create_index("ix_clients_city", "clients", ["city"])

    op.create_table(
        "service_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_service_types_name", "service_types", ["name"], unique=True)

    op.create_table(
        "contracts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contracts_client_id", "contracts", ["client_id"])
    op.create_index("ix_contracts_start_date", "contracts", ["start_date"])
    op.create_index("ix_contracts_end_date", "contracts", ["end_date"])
    op.create_index("ix_contracts_dates", "contracts", ["start_date", "end_date"])

    op.create_table(
        "contract_line_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("contract_id", sa.Integer(), nullable=False),
        sa.Column("service_type_id", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.ForeignKeyConstraint(["contract_id"], ["contracts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["service_type_id"], ["service_types.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_contract_line_items_contract_id",
        "contract_line_items",
        ["contract_id"],
    )
    op.create_index(
        "ix_contract_line_items_service_type_id",
        "contract_line_items",
        ["service_type_id"],
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("contract_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("paid_at", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["contract_id"], ["contracts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_contract_id", "payments", ["contract_id"])
    op.create_index("ix_payments_paid_at", "payments", ["paid_at"])
    op.create_index(
        "ix_payments_contract_paid_at", "payments", ["contract_id", "paid_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_payments_contract_paid_at", table_name="payments")
    op.drop_index("ix_payments_paid_at", table_name="payments")
    op.drop_index("ix_payments_contract_id", table_name="payments")
    op.drop_table("payments")

    op.drop_index("ix_contract_line_items_service_type_id", table_name="contract_line_items")
    op.drop_index("ix_contract_line_items_contract_id", table_name="contract_line_items")
    op.drop_table("contract_line_items")

    op.drop_index("ix_contracts_dates", table_name="contracts")
    op.drop_index("ix_contracts_end_date", table_name="contracts")
    op.drop_index("ix_contracts_start_date", table_name="contracts")
    op.drop_index("ix_contracts_client_id", table_name="contracts")
    op.drop_table("contracts")

    op.drop_index("ix_service_types_name", table_name="service_types")
    op.drop_table("service_types")

    op.drop_index("ix_clients_city", table_name="clients")
    op.drop_index("ix_clients_company_name", table_name="clients")
    op.drop_index("ix_clients_status", table_name="clients")
    op.drop_table("clients")

    client_status.drop(op.get_bind(), checkfirst=True)
