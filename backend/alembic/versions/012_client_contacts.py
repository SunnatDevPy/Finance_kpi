"""Revision ID: 012
Revises: 011
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "client_contacts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_client_contacts_client_id", "client_contacts", ["client_id"])

    op.execute(
        """
        INSERT INTO client_contacts (client_id, name, phone, sort_order)
        SELECT id, contact_person, phone, 0
        FROM clients
        WHERE contact_person IS NOT NULL AND TRIM(contact_person) <> ''
        """
    )


def downgrade() -> None:
    op.drop_index("ix_client_contacts_client_id", table_name="client_contacts")
    op.drop_table("client_contacts")
