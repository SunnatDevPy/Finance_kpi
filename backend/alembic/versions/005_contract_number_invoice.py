"""contract number and invoice (esf) number

Revision ID: 005
Revises: 004
Create Date: 2026-07-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("contracts", sa.Column("contract_number", sa.String(length=50), nullable=True))
    op.add_column("contracts", sa.Column("invoice_number", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("contracts", "invoice_number")
    op.drop_column("contracts", "contract_number")
