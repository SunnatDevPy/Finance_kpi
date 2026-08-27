"""Create trips and trip_factories tables

Revision ID: 014
Revises: 013
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trips",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=False),
        sa.Column("country", sa.String(length=100), server_default="O'zbekiston", nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("employee_name", sa.String(length=150), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column("results", sa.Text(), nullable=True),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trips_region", "trips", ["region"])
    op.create_index("ix_trips_start_date", "trips", ["start_date"])
    op.create_index("ix_trips_end_date", "trips", ["end_date"])
    op.create_index("ix_trips_user_id", "trips", ["user_id"])
    op.create_index("ix_trips_deleted_at", "trips", ["deleted_at"])

    op.create_table(
        "trip_factories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("factory_name", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trip_factories_trip_id", "trip_factories", ["trip_id"])
    op.create_index("ix_trip_factories_client_id", "trip_factories", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_trip_factories_client_id", table_name="trip_factories")
    op.drop_index("ix_trip_factories_trip_id", table_name="trip_factories")
    op.drop_table("trip_factories")

    op.drop_index("ix_trips_deleted_at", table_name="trips")
    op.drop_index("ix_trips_user_id", table_name="trips")
    op.drop_index("ix_trips_end_date", table_name="trips")
    op.drop_index("ix_trips_start_date", table_name="trips")
    op.drop_index("ix_trips_region", table_name="trips")
    op.drop_table("trips")
