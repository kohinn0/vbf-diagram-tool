"""
API tesztek: login, register, jelszó hash, rate limit (brute-force).
"""
import pytest
from fastapi import status


def test_login_success(client, db_session):
    from database import User
    from auth import get_password_hash

    user = User(
        username="villany",
        hashed_password=get_password_hash("Jelszo123!"),
        role="TECH",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    r = client.post("/api/login", data={"username": "villany", "password": "Jelszo123!"})
    assert r.status_code == status.HTTP_200_OK
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, db_session):
    from database import User
    from auth import get_password_hash

    user = User(
        username="villany",
        hashed_password=get_password_hash("Jelszo123!"),
        role="TECH",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    r = client.post("/api/login", data={"username": "villany", "password": "RosszJelszo"})
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_unknown_user(client):
    r = client.post("/api/login", data={"username": "nincsilyen", "password": "Jelszo123!"})
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_requires_auth(client):
    r = client.get("/api/users/me")
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_success(client, auth_headers):
    r = client.get("/api/users/me", headers=auth_headers)
    assert r.status_code == status.HTTP_200_OK
    assert r.json()["username"] == "testadmin"
    assert r.json()["role"] == "ADMIN"


def test_password_hash_roundtrip():
    from auth import get_password_hash, verify_password

    plain = "TesztJelszo123!"
    hashed = get_password_hash(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)
    assert not verify_password("Rossz", hashed)
