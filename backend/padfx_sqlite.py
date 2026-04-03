"""
Metrel measData.sqlite (és hasonló) → ugyanaz a lista, mint az `analyzer2.parse_padfx_xml`.
A táblák/oszlopok név szerint rugalmasak (MID/mid, NodeName, R_1, stb.).
"""
from __future__ import annotations

import json
import re
import sqlite3
from typing import Any, Dict, List, Optional


def _mid_to_type(mid: str) -> str:
    m = str(mid).strip()
    if m == "20":
        return "Rpe Folytonosság"
    if m in ("16", "17", "111"):
        return "Zs Hurokellenállás"
    if m in ("11", "12", "14"):
        return "RCD (FI-relé)"
    if m == "22":
        return "Riso Szigetelés"
    return "Ismeretlen"


def _norm_row(row: sqlite3.Row | tuple, columns: List[str]) -> Dict[str, Any]:
    if hasattr(row, "keys"):
        return {k: row[k] for k in row.keys()}
    return {columns[i]: row[i] for i in range(len(columns))}


def _lower_map(d: Dict[str, Any]) -> Dict[str, Any]:
    return {str(k).lower(): v for k, v in d.items()}


def _row_to_measurement(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Egy táblasor → analyzer2-stílusú measurement dict."""
    nk = _lower_map(raw)
    mid = nk.get("mid")
    if mid is None:
        for alt in ("measurementid", "measid", "measureid", "testid", "m_id"):
            if nk.get(alt) is not None:
                mid = nk.get(alt)
                break
    if mid is None:
        return None
    mid_s = str(mid).strip()
    if not mid_s or mid_s.lower() in ("null", "none"):
        return None

    loc = (
        nk.get("nodename")
        or nk.get("location")
        or nk.get("objectname")
        or nk.get("path")
        or nk.get("title")
        or nk.get("name")
        or nk.get("circuit")
        or ""
    )
    if loc is not None:
        loc = str(loc)
    else:
        loc = ""

    dt = str(
        nk.get("date")
        or nk.get("datetime")
        or nk.get("time")
        or nk.get("created")
        or ""
    )

    params: Dict[str, str] = {}
    results: Dict[str, str] = {}

    for k, v in nk.items():
        if v is None:
            continue
        vs = str(v).strip()
        if not vs:
            continue
        m = re.match(r"^p[_]?(\d+)$", k, re.I)
        if m:
            params[f"p_{m.group(1)}"] = vs
            continue
        m = re.match(r"^param[_]?(\d+)$", k, re.I)
        if m:
            params[f"p_{m.group(1)}"] = vs
            continue
        m = re.match(r"^r[_]?(\d+)$", k, re.I)
        if m:
            results[f"r_{m.group(1)}"] = vs
            continue
        m = re.match(r"^result[_]?(\d+)$", k, re.I)
        if m:
            results[f"r_{m.group(1)}"] = vs
            continue

    # Metrel: Value1..ValueN, Param1..ParamN
    for i in range(1, 32):
        pk = f"param{i}"
        rk = f"value{i}"
        if pk in nk and nk[pk] is not None and str(nk[pk]).strip():
            params[f"p_{i}"] = str(nk[pk]).strip()
        if rk in nk and nk[rk] is not None and str(nk[rk]).strip():
            results[f"r_{i}"] = str(nk[rk]).strip()

    # JSON oszlop (egyes exportok)
    for blob_key in ("params_json", "results_json", "data", "payload"):
        if blob_key in nk and nk[blob_key]:
            try:
                blob = nk[blob_key]
                if isinstance(blob, str):
                    obj = json.loads(blob)
                else:
                    obj = blob
                if isinstance(obj, dict):
                    for kk, vv in obj.items():
                        sk = str(kk).lower()
                        if sk.startswith("p") or "param" in sk:
                            params[f"p_{len(params)+1}"] = str(vv)
                        else:
                            results[f"r_{len(results)+1}"] = str(vv)
            except Exception:
                pass

    return {
        "mid": mid_s,
        "type": _mid_to_type(mid_s),
        "location": loc,
        "date": dt,
        "params": params,
        "results": results,
    }


def _best_measure_table(conn: sqlite3.Connection) -> Optional[str]:
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]
    priority = ("MeasureData", "Measurements", "Measurement", "MeasData", "Data")
    for p in priority:
        if p in tables:
            return p
    for t in tables:
        if t.startswith("sqlite"):
            continue
        cur.execute(f'PRAGMA table_info("{t}")')
        cols = [r[1].lower() for r in cur.fetchall()]
        if "mid" in cols or "measurementid" in cols:
            return t
    return None


def parse_padfx_sqlite(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """Összes releváns mérési sor feldolgozása."""
    table = _best_measure_table(conn)
    if not table:
        return []

    cur = conn.cursor()
    cur.execute(f'PRAGMA table_info("{table}")')
    col_info = cur.fetchall()
    columns = [r[1] for r in col_info]

    cur.execute(f'SELECT * FROM "{table}"')
    rows = cur.fetchall()
    out: List[Dict[str, Any]] = []
    for row in rows:
        if hasattr(row, "keys"):
            d = {k: row[k] for k in row.keys()}
        else:
            d = {columns[i]: row[i] for i in range(len(columns))}
        m = _row_to_measurement(d)
        if m:
            out.append(m)
    return out
