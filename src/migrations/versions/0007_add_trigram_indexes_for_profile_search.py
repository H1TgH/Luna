"""add trigram indexes for profile search

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-12 14:40:24.045615

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0007'
down_revision: Union[str, Sequence[str], None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE EXTENSION IF NOT EXISTS pg_trgm"
    )
    
    op.create_index(
        index_name="profiles_username_trgm_idx",
        table_name="profiles",
        columns=["username"],
        postgresql_using="gin",
        postgresql_ops={
            "username": "gin_trgm_ops"
        }
    )
    op.create_index(
        index_name="profiles_first_name_trgm_idx",
        table_name="profiles",
        columns=["first_name"],
        postgresql_using="gin",
        postgresql_ops={
            "first_name": "gin_trgm_ops"
        }
    )
    op.create_index(
        index_name="profiles_last_name_trgm_idx",
        table_name="profiles",
        columns=["last_name"],
        postgresql_using="gin",
        postgresql_ops={
            "last_name": "gin_trgm_ops"
        }
    )


def downgrade() -> None:
    op.drop_index(
        index_name="profiles_username_trgm_idx",
        table_name="profiles",
    )
    op.drop_index(
        index_name="profiles_first_name_trgm_idx",
        table_name="profiles",
    )
    op.drop_index(
        index_name="profiles_last_name_trgm_idx",
        table_name="profiles",
    )
