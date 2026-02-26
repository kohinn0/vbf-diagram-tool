import sqlite3
import os

db_path = './backend/data/vbf_database.db'
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
    finally:
        conn.close()
else:
    print(f'Database file not found at {db_path}')
