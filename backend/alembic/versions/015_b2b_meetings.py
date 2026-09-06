"""Add B2B meeting fields to trips table

Revision ID: 015
Revises: 014
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column("meeting_format", sa.String(length=50), server_default="live", nullable=False),
    )
    op.add_column(
        "trips",
        sa.Column("company_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "trips",
        sa.Column("client_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "trips",
        sa.Column("services_discussed", sa.Text(), nullable=True),
    )
    op.add_column(
        "trips",
        sa.Column("next_step", sa.Text(), nullable=True),
    )
    op.add_column(
        "trips",
        sa.Column("status", sa.String(length=50), server_default="in_progress", nullable=False),
    )
    op.add_column(
        "trips",
        sa.Column("deal_potential", sa.Numeric(precision=15, scale=2), server_default="0", nullable=False),
    )

    op.create_foreign_key(
        "fk_trips_client_id",
        "trips",
        "clients",
        ["client_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index("ix_trips_meeting_format", "trips", ["meeting_format"])
    op.create_index("ix_trips_status", "trips", ["status"])
    op.create_index("ix_trips_client_id", "trips", ["client_id"])

    # Backfill company_name and client_id from existing trip_factories if available
    op.execute(
        """
        UPDATE trips t
        SET company_name = tf.factory_name,
            client_id = tf.client_id
        FROM (
            SELECT DISTINCT ON (trip_id) trip_id, factory_name, client_id
            FROM trip_factories
            ORDER BY trip_id, id
        ) tf
        WHERE t.id = tf.trip_id AND (t.company_name IS NULL OR t.company_name = '')
        """
    )
    op.execute(
        """
        UPDATE trips
        SET company_name = title
        WHERE company_name IS NULL OR company_name = ''
        """
    )


def downgrade() -> None:
    op.drop_index("ix_trips_client_id", table_name="trips")
    op.drop_index("ix_trips_status", table_name="trips")
    op.drop_index("ix_trips_meeting_format", table_name="trips")
    op.drop_constraint("fk_trips_client_id", "trips", type_="foreignkey")
    op.drop_column("trips", "deal_potential")
    op.drop_column("trips", "status")
    op.drop_column("trips", "next_step")
    op.drop_column("trips", "services_discussed")
    op.drop_column("trips", "client_id")
    op.drop_column("trips", "company_name")
    op.drop_column("trips", "meeting_format")
