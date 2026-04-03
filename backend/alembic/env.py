import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

config = context.config
if config.config_file_name is not None:
    try:
        fileConfig(config.config_file_name)
    except Exception:
        pass

from database import Base  # noqa: E402

target_metadata = Base.metadata


def _resolve_url() -> str:
    """Elsődleges: `run_alembic_upgrade()` által beállított URL; különben DATABASE_URL / database modul."""
    url = config.get_main_option("sqlalchemy.url") or ""
    if url and "driver://" not in url and ".alembic_placeholder" not in url:
        if url.startswith("postgres://"):
            return "postgresql://" + url[len("postgres://") :]
        return url
    u = os.environ.get("DATABASE_URL")
    if u:
        if u.startswith("postgres://"):
            return "postgresql://" + u[len("postgres://") :]
        return u
    import database as dbmod  # noqa: E402

    u2 = dbmod.SQLALCHEMY_DATABASE_URL
    if not u2:
        raise RuntimeError("Alembic: állítsd a DATABASE_URL-t vagy futtasd run_alembic_upgrade()-t URL-lel.")
    if u2.startswith("postgres://"):
        return "postgresql://" + u2[len("postgres://") :]
    return u2


def run_migrations_offline() -> None:
    url = _resolve_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = _resolve_url()
    section = config.get_section(config.config_ini_section) or {}
    section["sqlalchemy.url"] = url
    connectable = engine_from_config(section, prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
