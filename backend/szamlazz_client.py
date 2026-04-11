"""
Szamlazz.hu API integráció – automatikus számla készítés fizetés után.

A `create_invoice_for_stripe_session` és `create_invoice_for_pending_order` jelenleg
stubok: vevő- és összegadatok összeállítása után nem küldenek XML-t az Agent API-nak;
a tényleges számlakészítés később illeszthető (XML request + POST, válasz feldolgozás).

Nem a végfelhasználóknak vállalt SaaS-szolgáltatás része; belső / üzemeltetői és webshop
környezetben opcionális, ha a hitelesítő adatok be vannak állítva.

Környezeti változók: SZAMLAZZ_USER, SZAMLAZZ_PASS, SZAMLAZZ_AGENT_URL (opcionális).
Ha nincs beállítva, a create_invoice_for_stripe_session semmit nem csinál (nem dob hibát).

Dokumentáció: https://docs.szamlazz.hu/
"""
import os
import logging
from typing import Optional, Tuple

logger = logging.getLogger("vbf")

SZAMLAZZ_USER = os.getenv("SZAMLAZZ_USER", "")
SZAMLAZZ_PASS = os.getenv("SZAMLAZZ_PASS", "")
SZAMLAZZ_AGENT_URL = os.getenv("SZAMLAZZ_AGENT_URL", "https://www.szamlazz.hu/szamla/")  # vagy szamlazz.hu által megadott


def create_invoice_for_stripe_session(session: dict, company, plan_type: str) -> Tuple[Optional[str], Optional[bytes]]:
    """
    Stripe checkout.session alapján számla készítése a Szamlazz.hu API-n (XML Agent).
    Vissza: (számlaszám, pdf_bytes). Ha nincs PDF, pdf_bytes=None.
    """
    if not SZAMLAZZ_USER or not SZAMLAZZ_PASS:
        logger.info("Szamlazz.hu: nincs SZAMLAZZ_USER/SZAMLAZZ_PASS, számla készítés kihagyva.")
        return None, None

    details = session.get("customer_details") or {}
    customer_email = details.get("email", "")
    customer_name = (details.get("name") or customer_email or "Vásárló").strip()
    address = details.get("address") or {}
    buyer = {
        "name": customer_name[:200],
        "zip": (address.get("postal_code") or "").strip()[:10],
        "city": (address.get("city") or "").strip()[:100],
        "address": (address.get("line1") or "").strip()[:200],
        "email": customer_email,
        "tax_number": "",
    }

    amount_total = session.get("amount_total")
    amount_huf = (amount_total or 0) // 100
    if amount_huf <= 0:
        logger.warning("Szamlazz.hu: nincs amount_total a session-ben, számla kihagyva.")
        return None, None

    # Stub: XML Agent kérés és POST a SZAMLAZZ_AGENT_URL-re — lásd modul docstring.
    logger.info(
        "Szamlazz.hu: számla készítés (stub) vevő=%s összeg=%s HUF.",
        buyer.get("name"), amount_huf
    )
    return None, None


def create_invoice_for_pending_order(order) -> Tuple[Optional[str], Optional[bytes]]:
    """
    Utalásos megrendeléshez számla készítése. Vissza: (számlaszám, pdf_bytes). Ha nincs PDF, pdf_bytes=None.
    """
    if not SZAMLAZZ_USER or not SZAMLAZZ_PASS:
        logger.info("Szamlazz.hu: nincs beállítás, utalásos számla kihagyva.")
        return None, None
    buyer = {
        "name": (order.customer_name or "")[:200],
        "zip": (order.buyer_zip or "").strip()[:10],
        "city": (order.buyer_city or "").strip()[:100],
        "address": (order.buyer_address or "").strip()[:200],
        "email": order.email,
        "tax_number": (order.buyer_tax_number or "").strip()[:20],
    }
    amount_huf = order.amount_huf or 0
    if amount_huf <= 0:
        return None, None
    logger.info(
        "Szamlazz.hu: utalásos számla (stub) vevő=%s összeg=%s HUF.",
        buyer.get("name"), amount_huf
    )
    # Stub: ugyanaz a folyamat, mint a Stripe session esetén — lásd modul docstring.
    return None, None
