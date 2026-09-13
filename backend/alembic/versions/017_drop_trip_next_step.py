"""Drop next_step from trips table

Revision ID: 017
Revises: 016
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("trips", "next_step")


def downgrade() -> None:
    op.add_column("trips", sa.Column("next_step", sa.Text(), nullable=True))
