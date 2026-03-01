"""
Brute-force védelem: sikertelen bejelentkezési kísérletek száma per kulcs (IP vagy username).
Lock 15 perc után N (pl. 5) sikertelen kísérlet.
"""
from datetime import datetime, timedelta
from typing import Optional

# in-memory: key -> { "count": int, "locked_until": datetime }
_bf_store: dict[str, dict] = {}
MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


def _key(identifier: str) -> str:
    return identifier.strip().lower()


def is_locked(identifier: str) -> bool:
    """True ha a kulcs (pl. IP vagy username) lockolva van."""
    k = _key(identifier)
    if k not in _bf_store:
        return False
    entry = _bf_store[k]
    locked_until = entry.get("locked_until")
    if locked_until and datetime.utcnow() < locked_until:
        return True
    # lejárt lock – töröljük
    if locked_until:
        del _bf_store[k]
    return False


def record_failure(identifier: str) -> None:
    """Sikertelen kísérlet rögzítése; 5. után lock."""
    k = _key(identifier)
    now = datetime.utcnow()
    if k not in _bf_store:
        _bf_store[k] = {"count": 0, "locked_until": None}
    entry = _bf_store[k]
    if entry.get("locked_until") and now < entry["locked_until"]:
        return  # már lockolva
    entry["count"] = entry.get("count", 0) + 1
    if entry["count"] >= MAX_ATTEMPTS:
        entry["locked_until"] = now + timedelta(minutes=LOCK_MINUTES)


def record_success(identifier: str) -> None:
    """Sikeres bejelentkezés – counter nullázása."""
    k = _key(identifier)
    if k in _bf_store:
        del _bf_store[k]
