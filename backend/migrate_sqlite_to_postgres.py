import argparse
import json
import os
import sys
from typing import Any, Dict, List, Optional

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.types import JSON as JSONType


def _default_sqlite_path() -> str:
    candidates = []
    # Prefer env to match backend behavior.
    p = os.environ.get("DATABASE_PATH")
    if p:
        candidates.append(p)
    candidates.extend(
        [
            "./data/vbf_database.db",
            "./backend/data/vbf_database.db",
            "data/vbf_database.db",
            "backend/data/vbf_database.db",
        ]
    )
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return "./data/vbf_database.db"


def _postgres_default_url() -> Optional[str]:
    return os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")


def _abort_if_postgres_not_empty(pg_engine, tables: List[str], force: bool) -> None:
    if force:
        return
    with pg_engine.connect() as conn:
        for t in tables:
            try:
                n = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar_one()
            except Exception:
                continue
            if n and n > 0:
                raise SystemExit(
                    f"Target Postgres seems non-empty (table={t}, count={n}). "
                    f"Pass --force-empty to overwrite."
                )


def _set_pg_sequences(pg_engine, tables_with_int_id: List[str]) -> None:
    # After inserting explicit ids, sequences may not point to the right "next" value.
    with pg_engine.connect() as conn:
        for t in tables_with_int_id:
            try:
                max_id = conn.execute(text(f"SELECT COALESCE(MAX(id), 1) FROM {t}")).scalar_one()
                seq = conn.execute(
                    text("SELECT pg_get_serial_sequence(:t, 'id')"),
                    {"t": t},
                ).scalar_one()
                if not seq:
                    continue
                conn.execute(text("SELECT setval(:seq, :max_id, true)"), {"seq": seq, "max_id": max_id})
            except Exception:
                # Best-effort; next inserts still work if identity was not used.
                pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate SQLite DB -> PostgreSQL using existing SQLAlchemy models.")
    parser.add_argument("--sqlite-path", default=None, help="Path to vbf_database.db (SQLite).")
    parser.add_argument("--postgres-url", default=None, help="Postgres URL, e.g. postgresql://user:pass@host:5432/db")
    parser.add_argument("--batch-size", type=int, default=200, help="Rows per batch.")
    parser.add_argument(
        "--force-empty",
        action="store_true",
        help="If set, allow overwriting a non-empty target (use with a fresh DB only).",
    )
    args = parser.parse_args()

    sqlite_path = args.sqlite_path or _default_sqlite_path()
    postgres_url = args.postgres_url or _postgres_default_url()
    if not postgres_url:
        raise SystemExit("Missing --postgres-url (or set DATABASE_URL / POSTGRES_URL env var).")
    if not os.path.exists(sqlite_path):
        raise SystemExit(f"SQLite file not found: {sqlite_path}")

    # Import backend models with SQLite pointing to our file.
    # database.py does side-effects (create_all / sqlite ALTERs). We want that to operate on the correct SQLite file.
    os.environ["DATABASE_PATH"] = sqlite_path
    os.environ.pop("DATABASE_URL", None)

    # Import database.py without requiring `backend` to be a package.
    # (backend/ has no __init__.py in this repo.) init_db nem fut importkor — csak main hívja.
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, os.path.join(repo_root, "backend"))
    import database  # type: ignore  # noqa: E402

    sqlite_engine = create_engine(
        f"sqlite:///{sqlite_path}",
        connect_args={"check_same_thread": False},
    )
    pg_engine = create_engine(postgres_url, pool_pre_ping=True)

    # Séma: Alembic (ugyanaz, mint éles induláskor)
    database.run_alembic_upgrade(postgres_url)

    # Safety check: abort if target already contains data.
    table_names = [t.name for t in database.Base.metadata.sorted_tables]
    _abort_if_postgres_not_empty(pg_engine, tables=["users", "reports", "companies"], force=args.force_empty)

    # Best-effort: wipe target tables if --force-empty (fresh DB recommended).
    if args.force_empty:
        with pg_engine.begin() as conn:
            for t in database.Base.metadata.sorted_tables:
                try:
                    conn.execute(text(f"DELETE FROM {t.name}"))
                except Exception:
                    pass

    json_cols_by_table: Dict[str, List[str]] = {}
    for t in database.Base.metadata.sorted_tables:
        json_cols = []
        for c in t.columns:
            if isinstance(c.type, JSONType):
                json_cols.append(c.name)
        if json_cols:
            json_cols_by_table[t.name] = json_cols

    existing_sqlite_tables = set()
    insp = inspect(sqlite_engine)
    try:
        existing_sqlite_tables = set(insp.get_table_names())
    except Exception:
        existing_sqlite_tables = set()

    tables_with_int_id: List[str] = []
    for t in database.Base.metadata.sorted_tables:
        if "id" in t.c and getattr(t.c["id"].type, "__class__", None).__name__.lower().find("int") >= 0:
            tables_with_int_id.append(t.name)

    # Insert in FK-safe order (sorted_tables uses dependency order).
    with sqlite_engine.connect() as sconn, pg_engine.begin() as pconn:
        for t in database.Base.metadata.sorted_tables:
            if t.name not in existing_sqlite_tables:
                continue

            # Read all sqlite rows (in batches), filter only columns that exist in Postgres schema.
            pg_cols = set(t.c.keys())
            sqlite_rows_query = text(f"SELECT * FROM {t.name}")
            result = sconn.execution_options(stream_results=True).execute(sqlite_rows_query)

            json_cols = json_cols_by_table.get(t.name, [])
            batch: List[Dict[str, Any]] = []
            inserted = 0

            while True:
                rows = result.fetchmany(args.batch_size)
                if not rows:
                    break

                for row in rows:
                    # result rows are tuples; map to dict using keys()
                    row_dict = dict(zip(result.keys(), row))
                    # Filter out columns not present in Postgres model.
                    values = {k: v for k, v in row_dict.items() if k in pg_cols}

                    # Parse JSON columns if sqlite returned them as text.
                    for jc in json_cols:
                        if jc in values and isinstance(values[jc], str) and values[jc].strip():
                            try:
                                values[jc] = json.loads(values[jc])
                            except Exception:
                                # Keep as-is; JSON column can still accept raw JSON strings.
                                pass

                    batch.append(values)

                if batch:
                    # Use table.insert() from SQLAlchemy Core.
                    pconn.execute(t.insert(), batch)
                    inserted += len(batch)
                    batch = []

            # Optional: print progress.
            # print(f"[OK] {t.name}: inserted {inserted} rows")

    _set_pg_sequences(pg_engine, tables_with_int_id)

    print("Migration completed successfully.")


if __name__ == "__main__":
    main()

