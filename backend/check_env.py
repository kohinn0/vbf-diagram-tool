import sys
print(f"Python Version: {sys.version}")
try:
    import fastapi
    print("FastAPI: OK")
    import sqlalchemy
    print("SQLAlchemy: OK")
    import pydantic
    print("Pydantic: OK")
    import docx
    print("python-docx: OK")
    import jose
    print("jose: OK")
    import passlib
    print("passlib: OK")
    import qrcode
    print("qrcode: OK")
    
    # Local imports
    import schemas
    import auth
    import database
    import generator
    print("Local modules: OK")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
