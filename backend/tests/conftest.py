"""
Pytest fixtures: test DB (SQLite in-memory), FastAPI client, auth token.
Saját engine + SessionLocal, és get_db felülírása, hogy a teszt DB-t használja.
"""
import os
import sys
import pytest

# Teszt DB URL mielőtt bármi betöltődne
os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base

# Fájl-alapú teszt DB (in-memory helyett, hogy minden kapcsolat ugyanazt lássa).
# Workspace-relatív útvonal (backend/data/), hogy CI-ben ne readonly legyen (pl. /tmp).
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_data_dir = os.path.join(_backend_dir, "data")
os.makedirs(_data_dir, exist_ok=True)
_test_db_path = os.path.join(_data_dir, "vbf_test.db")
if os.path.exists(_test_db_path):
    try:
        os.unlink(_test_db_path)
    except Exception:
        pass
_test_engine = create_engine(f"sqlite:///{_test_db_path}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

# Auth és main import csak az engine után (database már betöltődött TESTING=1-gyel)
from auth import get_db
from main import app


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    """Táblák létrehozása, session, majd takarítás."""
    Base.metadata.create_all(bind=_test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=_test_engine)
        try:
            os.unlink(_test_db_path)
        except Exception:
            pass


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient; get_db a teszt engine-t használja."""
    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client, db_session):
    """Create admin user, login, return headers with Bearer token."""
    from database import User
    from auth import get_password_hash

    user = User(
        username="testadmin",
        hashed_password=get_password_hash("TestJelszo123!"),
        role="ADMIN",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    r = client.post(
        "/api/login",
        data={"username": "testadmin", "password": "TestJelszo123!"},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
