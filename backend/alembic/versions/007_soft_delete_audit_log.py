"""soft delete columns + audit_logs table

Revision ID: 007
Revises: 006
Create Date: 2026-07-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("contracts", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    audit_action = sa.Enum(
        "create", "update", "delete", "restore", name="audit_action"
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("action", audit_action, nullable=False),
        sa.Column("summary", sa.String(length=500), nullable=True),
        sa.Column("changes", sa.Text(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("username", sa.String(length=150), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity", table_name="audit_logs")
    op.drop_table("audit_logs")
    audit_action = sa.Enum("create", "update", "delete", "restore", name="audit_action")
    audit_action.drop(op.get_bind(), checkfirst=True)

    op.drop_column("payments", "deleted_at")
    op.drop_column("contracts", "deleted_at")
    op.drop_column("clients", "deleted_at")
