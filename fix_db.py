import sqlite3
import os

db_path = 'backend/data/vbf_database.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("UPDATE users SET role='ADMIN' WHERE username='admin'")
    conn.commit()
    conn.close()
    print("Minden 'admin' felhasználó Adminisztrátori rangot kapott!")
else:
    print("Database not found at", db_path)
