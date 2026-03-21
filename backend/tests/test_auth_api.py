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


def test_register_demo_after_bootstrap(client, db_session):
    from database import User, MarketingSubscriber
    from auth import get_password_hash

    admin = User(
        username="bootstrap",
        hashed_password=get_password_hash("Bootstrap123!"),
        role="ADMIN",
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()

    r = client.post(
        "/api/register",
        json={
            "username": "demouser",
            "email": "demo@example.com",
            "password": "Jelszo123!",
            "company_name": "Teszt Villany Kft.",
            "marketing_opt_in": True,
        },
    )
    assert r.status_code == status.HTTP_200_OK
    data = r.json()
    assert data["username"] == "demouser"
    assert data["role"] == "COMPANY_ADMIN"
    assert data["company_plan"] == "FREE"
    assert data["pdf_export_watermarked"] is True

    sub = db_session.query(MarketingSubscriber).filter(MarketingSubscriber.email == "demo@example.com").first()
    assert sub is not None
    assert sub.unsubscribed_at is None


def test_marketing_subscribe_public(client, db_session):
    from database import MarketingSubscriber

    r = client.post(
        "/api/marketing/subscribe",
        json={
            "email": "hirlevel@example.com",
            "name": "Kovács",
            "consent": True,
            "source": "landing",
        },
    )
    assert r.status_code == status.HTTP_200_OK
    row = db_session.query(MarketingSubscriber).filter(MarketingSubscriber.email == "hirlevel@example.com").first()
    assert row is not None
    assert row.name == "Kovács"


def test_marketing_subscribe_requires_consent(client):
    r = client.post(
        "/api/marketing/subscribe",
        json={"email": "x@y.hu", "consent": False},
    )
    assert r.status_code == status.HTTP_400_BAD_REQUEST


def test_password_hash_roundtrip():
    from auth import get_password_hash, verify_password

    plain = "TesztJelszo123!"
    hashed = get_password_hash(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)
    assert not verify_password("Rossz", hashed)
