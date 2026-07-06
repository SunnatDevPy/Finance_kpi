"""incomes table (boshqa kirimlar)

Revision ID: 010
Revises: 009
Create Date: 2026-07-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INCOME_CATEGORY_VALUES = (
    "sale",
    "service",
    "investment",
    "loan",
    "grant",
    "refund",
    "other",
)


def upgrade() -> None:
    income_category = sa.Enum(*INCOME_CATEGORY_VALUES, name="income_category")

    op.create_table(
        "incomes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("category", income_category, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("income_date", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_incomes_category", "incomes", ["category"])
    op.create_index("ix_incomes_income_date", "incomes", ["income_date"])


def downgrade() -> None:
    op.drop_index("ix_incomes_income_date", table_name="incomes")
    op.drop_index("ix_incomes_category", table_name="incomes")
    op.drop_table("incomes")
    sa.Enum(name="income_category").drop(op.get_bind(), checkfirst=True)
