"""
API tesztek: reports list, create, get (auth kötelező).
"""
import pytest
from fastapi import status


def test_reports_list_unauthorized(client):
    r = client.get("/api/reports")
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_reports_list_empty(client, auth_headers):
    r = client.get("/api/reports", headers=auth_headers)
    assert r.status_code == status.HTTP_200_OK
    assert r.json() == []


def test_reports_create_and_list(client, auth_headers):
    payload = {
        "title": "Teszt VBF",
        "report_type": "vbf_idoszakos",
        "client_data": {"type": "VBF_IDOSZAKOS", "customerName": "Teszt Kft."},
        "defects_data": [],
        "measurements_data": [{}],
    }
    r = client.post("/api/reports", json=payload, headers=auth_headers)
    assert r.status_code == status.HTTP_200_OK
    data = r.json()
    assert data["title"] == "Teszt VBF"
    assert "id" in data

    r2 = client.get("/api/reports", headers=auth_headers)
    assert r2.status_code == status.HTTP_200_OK
    assert len(r2.json()) >= 1
    ids = [x["id"] for x in r2.json()]
    assert data["id"] in ids


def test_reports_get_by_id(client, auth_headers):
    payload = {
        "title": "Egyedi report",
        "report_type": "vbf_idoszakos",
        "client_data": {},
        "defects_data": [],
        "measurements_data": [{}],
    }
    create = client.post("/api/reports", json=payload, headers=auth_headers)
    assert create.status_code == status.HTTP_200_OK
    rid = create.json()["id"]

    r = client.get(f"/api/reports/{rid}", headers=auth_headers)
    assert r.status_code == status.HTTP_200_OK
    assert r.json()["id"] == rid
    assert r.json()["title"] == "Egyedi report"
