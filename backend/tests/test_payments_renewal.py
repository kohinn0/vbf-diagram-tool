"""Előfizetés ráépítés (hosszabbítás) grant_access_after_payment után."""
from datetime import datetime, timedelta


def test_grant_access_stacks_onto_future_expiry(db_session):
    from auth import get_password_hash
    from database import Company, User
    from routers.payments import grant_access_after_payment

    company = Company(name="Teszt Kft", plan="PRO")
    db_session.add(company)
    db_session.flush()
    future = datetime.utcnow() + timedelta(days=80)
    admin = User(
        username="vezeto",
        email="vezeto@teszt.hu",
        hashed_password=get_password_hash("Jelszo123!"),
        role="COMPANY_ADMIN",
        company_id=company.id,
        subscription_expires=future,
    )
    tech = User(
        username="szerelo",
        email="szerelo@teszt.hu",
        hashed_password=get_password_hash("Jelszo123!"),
        role="TECH",
        company_id=company.id,
        subscription_expires=future,
    )
    db_session.add_all([admin, tech])
    db_session.commit()

    grant_access_after_payment(db_session, "vezeto@teszt.hu", "Teszt Kft", "yearly")

    db_session.refresh(admin)
    db_session.refresh(tech)
    assert admin.subscription_expires == tech.subscription_expires
    assert admin.subscription_expires > future + timedelta(days=300)


def test_grant_access_starts_from_now_when_expired(db_session):
    from auth import get_password_hash
    from database import Company, User
    from routers.payments import grant_access_after_payment

    company = Company(name="Lejárt Kft", plan="PRO")
    db_session.add(company)
    db_session.flush()
    past = datetime.utcnow() - timedelta(days=5)
    admin = User(
        username="admin2",
        email="admin2@teszt.hu",
        hashed_password=get_password_hash("Jelszo123!"),
        role="COMPANY_ADMIN",
        company_id=company.id,
        subscription_expires=past,
    )
    db_session.add(admin)
    db_session.commit()
    before = datetime.utcnow()

    grant_access_after_payment(db_session, "admin2@teszt.hu", "Lejárt Kft", "monthly")

    db_session.refresh(admin)
    assert admin.subscription_expires > before + timedelta(days=25)
    assert admin.subscription_expires < before + timedelta(days=40)
