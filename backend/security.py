import os
import time
import inspect
from functools import wraps
from typing import Optional

from redis.asyncio import Redis
from fastapi import Request

# A Redis klienst lifespan event-ben inicializáljuk (FastAPI main-ben),
# de fallback-ként itt is létrehozható, ha még nem állítottuk be.
_redis_client: Optional[Redis] = None


def create_redis() -> Redis:
    """Új Redis kliens példány létrehozása (async, connection poollal)."""
    return Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        decode_responses=True,
    )


def set_redis(client: Redis) -> None:
    """Lifespan-ben hívjuk: ezzel állítjuk be a globális Redis klienst."""
    global _redis_client
    _redis_client = client


def get_redis() -> Redis:
    """
    Visszaadja a Redis klienst.
    Ha még nincs beállítva (pl. teszt esetén), lazy módon létrehozza.
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = create_redis()
    return _redis_client


class RateLimitExceeded(Exception):
    """
    Rate limit túllépés jelzése.
    retry_after másodpercben opcionálisan tartalmazza,
    hogy mennyi idő múlva érdemes újra próbálni.
    """
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


def _normalize_identifier(identifier: str) -> str:
    return (identifier or "").strip().lower()


_FAILURE_LUA_SCRIPT = """
local fk, lk, sk = KEYS[1], KEYS[2], KEYS[3]
local fail_limit, lock_secs, strike_ttl, max_lock = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])

local fails = redis.call("INCR", fk)
redis.call("EXPIRE", fk, lock_secs)

if fails < fail_limit then return {fails, 0, 0} end

redis.call("DEL", fk)
local strikes = redis.call("INCR", sk)
redis.call("EXPIRE", sk, strike_ttl)

local calc_lock = math.min(max_lock, lock_secs * (2 ^ (strikes - 1)))
redis.call("SETEX", lk, math.floor(calc_lock), "1")
return {fails, strikes, calc_lock}
"""


_TRUSTED_PROXIES = {
    ip.strip()
    for ip in (os.getenv("TRUST_FORWARD_PROXIES", "") or "").split(",")
    if ip.strip()
}


def _client_identifier_from_request(request: Request) -> str:
    """
    IP kinyerése reverse proxy mögül is (X-Forwarded-For, X-Real-IP).
    """
    client_host = request.client.host if request.client else None

    # Csak akkor fogadjuk el a forwarded headereket, ha a kérés
    # egy megbízható proxy IP-jéről érkezett.
    if client_host and client_host in _TRUSTED_PROXIES:
        xff = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
        if xff:
            # első cím az eredeti kliens (proxy lánc eleje)
            return xff.split(",")[0].strip()
        x_real = request.headers.get("x-real-ip") or request.headers.get("X-Real-IP")
        if x_real:
            return x_real.strip()
    if client_host:
        return client_host
    return "unknown"


def _extract_identifier(args, kwargs) -> str:
    """
    Megpróbáljuk kinyerni a FastAPI Request-et az args/kwargs-ból.
    Ha nincs Request, az programozási hiba: explicit hibát dobunk.
    """
    for value in list(args) + list(kwargs.values()):
        if isinstance(value, Request):
            return _client_identifier_from_request(value)
    raise ValueError("Missing Request object for rate limiting – add 'request: Request' param")


async def _apply_rate_limit(key_prefix: str, identifier: str, limit: int, window_seconds: int):
    key = f"rl:{key_prefix}:{identifier}"

    redis = get_redis()
    pipe = redis.pipeline()
    now = time.time()

    pipe.zremrangebyscore(key, 0, now - window_seconds)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window_seconds)

    _, _, count, _ = await pipe.execute()

    if count > limit:
        # Meghatározzuk, mikor esik ki a legrégebbi kérés az ablakból.
        first = await redis.zrange(key, 0, 0, withscores=True)
        retry_after = None
        if first:
            first_ts = first[0][1]
            retry_after = max(1, int(window_seconds - (now - first_ts)))
        raise RateLimitExceeded(
            f"Túl sok kérés! Limit: {limit}/{window_seconds}s",
            retry_after=retry_after,
        )


LOGIN_FAIL_LIMIT = int(os.getenv("LOGIN_FAIL_LIMIT", "5"))
LOGIN_LOCK_SECONDS = int(os.getenv("LOGIN_LOCK_SECONDS", "900"))  # alap: 15 perc
STRIKE_TTL_SECONDS = int(os.getenv("LOGIN_STRIKE_TTL_SECONDS", "86400"))  # alap: 24 óra
MAX_LOCK_SECONDS = int(os.getenv("LOGIN_MAX_LOCK_SECONDS", str(3600 * 24)))  # alap: max 1 nap
REDIS_NAMESPACE = os.getenv("SECURITY_REDIS_NAMESPACE", "bf:login")


def _ns(*parts: str) -> str:
    """Biztonsági modul névtere a Redis-ben."""
    return ":".join([REDIS_NAMESPACE, *parts])


def _lock_key(identifier: str) -> str:
    return _ns("lock", identifier)


def _fail_key(identifier: str) -> str:
    return _ns("fail", identifier)


def _strike_key(identifier: str) -> str:
    return _ns("strike", identifier)


async def is_locked(identifier: str) -> bool:
    """
    Visszaadja, hogy az adott IP / felhasználónév zárolva van-e a túl sok sikertelen próbálkozás miatt.
    """
    if not identifier:
        return False
    identifier = _normalize_identifier(identifier)
    redis = get_redis()
    return bool(await redis.get(_lock_key(identifier)))


async def _record_failure_async(identifier: str) -> None:
    """
    Sikertelen bejelentkezési próbálkozás rögzítése.
    Bukás-számláló + priusz (strike) + progresszív lock idő.
    """
    if not identifier:
        return
    clean_id = _normalize_identifier(identifier)

    fk = _fail_key(clean_id)
    lk = _lock_key(clean_id)
    sk = _strike_key(clean_id)
    redis = get_redis()
    lua_op = redis.register_script(_FAILURE_LUA_SCRIPT)
    try:
        await lua_op(
            keys=[fk, lk, sk],
            args=[LOGIN_FAIL_LIMIT, LOGIN_LOCK_SECONDS, STRIKE_TTL_SECONDS, MAX_LOCK_SECONDS],
        )
    except Exception as e:
        # Biztonság legyen elsődleges: ha a védelmi rendszer nem működik,
        # ne engedjük tovább a próbálkozást.
        raise


async def record_failure(identifier: str) -> None:
    """Publikus async wrapper sikertelen login esethez."""
    if not identifier:
        return
    await _record_failure_async(identifier)


async def _record_success_async(identifier: str) -> None:
    """
    Sikeres bejelentkezés esetén töröljük a számlálót és a lockot.
    """
    if not identifier:
        return
    clean_id = _normalize_identifier(identifier)
    redis = get_redis()
    await redis.delete(_fail_key(clean_id))
    await redis.delete(_lock_key(clean_id))
    await redis.delete(_strike_key(clean_id))


async def record_success(identifier: str) -> None:
    """Publikus async wrapper sikeres bejelentkezéshez."""
    if not identifier:
        return
    await _record_success_async(identifier)


def rate_limit(key_prefix: str, limit: int, window_seconds: int):
    """
    FastAPI-hoz tervezett ASYNC rate limiter dekorátor.
    Használat:
      - Csak async path operation-ökre!
      - Az endpoint paraméterei között legyen egy Request (pl. request: Request),
        különben ValueError-t dobunk dekoráció/működés közben.
    """

    def decorator(func):
        if not inspect.iscoroutinefunction(func):
            raise TypeError("rate_limit csak async FastAPI endpointokra használható (async def ...).")

        @wraps(func)
        async def wrapper(*args, **kwargs):
            identifier = _extract_identifier(args, kwargs)
            await _apply_rate_limit(key_prefix, identifier, limit, window_seconds)
            return await func(*args, **kwargs)

        return wrapper

    return decorator
