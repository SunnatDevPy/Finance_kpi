"""Add deal_potential to trip_factories table

Revision ID: 016
Revises: 015
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trip_factories",
        sa.Column("deal_potential", sa.Numeric(precision=15, scale=2), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("trip_factories", "deal_potential")
