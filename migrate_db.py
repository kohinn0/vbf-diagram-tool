import sqlite3
import os

# Prefer data/ next to backend (or backend/data)
db_path = os.environ.get("DATABASE_PATH")
if not db_path:
    for p in ["./data/vbf_database.db", "./backend/data/vbf_database.db"]:
        if os.path.exists(p):
            db_path = p
            break
if not db_path:
    db_path = "./data/vbf_database.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute('ALTER TABLE reports ADD COLUMN diagram_image TEXT')
        conn.commit()
        print('Column diagram_image added to reports table.')
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e).lower():
            print('Column diagram_image already exists.')
        else:
            print(f'Operational error: {e}')
    except Exception as e:
        print(f'General error: {e}')

    # measurement_templates (céges mérési sablonok)
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS measurement_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER REFERENCES companies(id),
                owner_id INTEGER REFERENCES users(id),
                name VARCHAR(128) NOT NULL,
                template_json TEXT NOT NULL,
                created_at DATETIME
            )
        """)
        conn.commit()
        print('Table measurement_templates ensured.')
    except Exception as e:
        print(f'measurement_templates: {e}')

    # 5.2 report_audit_log table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS report_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_id INTEGER NOT NULL REFERENCES reports(id),
                user_id INTEGER REFERENCES users(id),
                action VARCHAR(64) NOT NULL,
                meta TEXT,
                created_at DATETIME,
                FOREIGN KEY(report_id) REFERENCES reports(id),
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        conn.commit()
        print('Table report_audit_log ensured.')
    except Exception as e:
        print(f'report_audit_log: {e}')
    finally:
        conn.close()
else:
    print(f'Database file not found at {db_path}')
