"""Create the initial ATLAS data schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE global_change_seq AS BIGINT")

    op.create_table(
        "household_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "member_type",
            sa.String(length=6),
            nullable=False,
        ),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
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
        sa.Column(
            "client_updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("change_seq", sa.BigInteger(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "member_type IN ('PERSON', 'ANIMAL')",
            name="ck_household_members_member_type",
        ),
        sa.CheckConstraint(
            "age IS NULL OR age >= 0",
            name="ck_household_members_age_non_negative",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_household_members"),
    )
    op.create_index(
        "ix_household_members_change_seq",
        "household_members",
        ["change_seq"],
    )

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
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
        sa.Column(
            "client_updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("change_seq", sa.BigInteger(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_categories"),
    )
    op.create_index(
        "ix_categories_change_seq",
        "categories",
        ["change_seq"],
    )
    op.create_index(
        "uq_categories_active_name_lower",
        "categories",
        [sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "inventory_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_kind", sa.String(length=5), nullable=False),
        sa.Column("unit", sa.String(length=7), nullable=False),
        sa.Column("daily_consumption", sa.Numeric(14, 3), nullable=True),
        sa.Column("consumption_basis", sa.String(length=10), nullable=False),
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
        sa.Column(
            "client_updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("change_seq", sa.BigInteger(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "item_kind IN ('FOOD', 'WATER', 'OTHER')",
            name="ck_inventory_items_item_kind",
        ),
        sa.CheckConstraint(
            "unit IN ('kg', 'g', 'L', 'ml', 'unidade', 'pacote', 'lata', 'garrafa')",
            name="ck_inventory_items_unit",
        ),
        sa.CheckConstraint(
            "consumption_basis IN ('HOUSEHOLD', 'PER_PERSON', 'PER_ANIMAL')",
            name="ck_inventory_items_consumption_basis",
        ),
        sa.CheckConstraint(
            "daily_consumption IS NULL OR daily_consumption >= 0",
            name="ck_inventory_items_daily_consumption_non_negative",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name="fk_inventory_items_category_id_categories",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_inventory_items"),
    )
    op.create_index(
        "ix_inventory_items_category_id",
        "inventory_items",
        ["category_id"],
    )
    op.create_index(
        "ix_inventory_items_change_seq",
        "inventory_items",
        ["change_seq"],
    )

    op.create_table(
        "stock_batches",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Numeric(14, 3), nullable=False),
        sa.Column("expiration_date", sa.Date(), nullable=True),
        sa.Column("batch_number", sa.String(length=200), nullable=True),
        sa.Column("storage_location", sa.String(length=200), nullable=True),
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
        sa.Column(
            "client_updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("change_seq", sa.BigInteger(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "quantity >= 0",
            name="ck_stock_batches_quantity_non_negative",
        ),
        sa.ForeignKeyConstraint(
            ["inventory_item_id"],
            ["inventory_items.id"],
            name="fk_stock_batches_inventory_item_id_inventory_items",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_stock_batches"),
    )
    op.create_index(
        "ix_stock_batches_inventory_item_id",
        "stock_batches",
        ["inventory_item_id"],
    )
    op.create_index(
        "ix_stock_batches_change_seq",
        "stock_batches",
        ["change_seq"],
    )
    op.create_index(
        "ix_stock_batches_inventory_item_id_expiration_date",
        "stock_batches",
        ["inventory_item_id", "expiration_date"],
    )

    op.create_table(
        "processed_mutations",
        sa.Column("mutation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("mutation_id", name="pk_processed_mutations"),
    )

    op.execute(
        """
        CREATE FUNCTION assign_change_seq_and_updated_at()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            NEW.change_seq := nextval('global_change_seq');
            NEW.updated_at := clock_timestamp();
            RETURN NEW;
        END;
        $$
        """
    )
    for table_name in (
        "household_members",
        "categories",
        "inventory_items",
        "stock_batches",
    ):
        op.execute(
            f"""
            CREATE TRIGGER trg_{table_name}_change_seq_updated_at
            BEFORE INSERT OR UPDATE ON {table_name}
            FOR EACH ROW
            EXECUTE FUNCTION assign_change_seq_and_updated_at()
            """
        )


def downgrade() -> None:
    for table_name in (
        "stock_batches",
        "inventory_items",
        "categories",
        "household_members",
    ):
        op.execute(f"DROP TRIGGER trg_{table_name}_change_seq_updated_at ON {table_name}")

    op.drop_table("processed_mutations")
    op.drop_index(
        "ix_stock_batches_inventory_item_id_expiration_date",
        table_name="stock_batches",
    )
    op.drop_index("ix_stock_batches_change_seq", table_name="stock_batches")
    op.drop_index("ix_stock_batches_inventory_item_id", table_name="stock_batches")
    op.drop_table("stock_batches")
    op.drop_index("ix_inventory_items_change_seq", table_name="inventory_items")
    op.drop_index("ix_inventory_items_category_id", table_name="inventory_items")
    op.drop_table("inventory_items")
    op.drop_index("uq_categories_active_name_lower", table_name="categories")
    op.drop_index("ix_categories_change_seq", table_name="categories")
    op.drop_table("categories")
    op.drop_index("ix_household_members_change_seq", table_name="household_members")
    op.drop_table("household_members")
    op.execute("DROP FUNCTION assign_change_seq_and_updated_at()")
    op.execute("DROP SEQUENCE global_change_seq")
