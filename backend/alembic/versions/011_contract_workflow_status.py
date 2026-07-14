"""contract workflow status column

Revision ID: 011
Revises: 010
Create Date: 2026-07-13

"""

from datetime import date
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

STATUS_ENUM = sa.Enum(
    "yangi",
    "davom_etmoqda",
    "tugadi",
    "toxtatildi",
    name="contract_workflow_status",
)


def upgrade() -> None:
    STATUS_ENUM.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "contracts",
        sa.Column(
            "status",
            STATUS_ENUM,
            nullable=False,
            server_default="yangi",
        ),
    )
    op.create_index("ix_contracts_status", "contracts", ["status"])

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            """
            SELECT c.id, c.start_date, c.end_date,
                   COALESCE(BOOL_AND(cli.is_cancelled), FALSE) AS all_cancelled
            FROM contracts c
            LEFT JOIN contract_line_items cli ON cli.contract_id = c.id
            GROUP BY c.id, c.start_date, c.end_date
            """
        )
    ).fetchall()

    today = date.today()
    for row in rows:
        if row.all_cancelled:
            status = "toxtatildi"
        elif row.end_date < today:
            status = "tugadi"
        elif row.start_date > today:
            status = "yangi"
        else:
            status = "davom_etmoqda"
        connection.execute(
            sa.text("UPDATE contracts SET status = :status WHERE id = :id"),
            {"status": status, "id": row.id},
        )


def downgrade() -> None:
    op.drop_index("ix_contracts_status", table_name="contracts")
    op.drop_column("contracts", "status")
    STATUS_ENUM.drop(op.get_bind(), checkfirst=True)
