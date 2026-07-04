"""contract line item cancellation

Revision ID: 004
Revises: 003
Create Date: 2026-07-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contract_line_items",
        sa.Column("is_cancelled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "contract_line_items",
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("contract_line_items", "is_cancelled", server_default=None)


def downgrade() -> None:
    op.drop_column("contract_line_items", "cancelled_at")
    op.drop_column("contract_line_items", "is_cancelled")
