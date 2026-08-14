"""Default finance auto-payments year 2027 → 2026

Revision ID: 013
Revises: 012
"""

from typing import Sequence, Union

from alembic import op

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_KEY = "finance_auto_payments_from_year"


def upgrade() -> None:
    op.execute(
        f"""
        UPDATE app_settings
        SET value = '2026'
        WHERE key = '{_KEY}' AND value = '2027'
        """
    )


def downgrade() -> None:
    op.execute(
        f"""
        UPDATE app_settings
        SET value = '2027'
        WHERE key = '{_KEY}' AND value = '2026'
        """
    )
