# db.py
import atexit
from psycopg2 import pool
from config import settings

# ThreadedConnectionPool — safe for FastAPI's threaded Uvicorn workers.
# minconn: connections kept alive at idle.
# maxconn: hard ceiling; requests block (then fail) beyond this.
# Tune via env vars DB_POOL_MIN / DB_POOL_MAX.
_pool: pool.ThreadedConnectionPool = pool.ThreadedConnectionPool(
    minconn=int(__import__("os").environ.get("DB_POOL_MIN", "2")),
    maxconn=int(__import__("os").environ.get("DB_POOL_MAX", "10")),
    dbname=settings.db_name,
    user=settings.db_user,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port,
)

# Return all connections cleanly when the process exits
atexit.register(_pool.closeall)


def get_connection():
    """
    Borrow a connection from the pool.
    Callers MUST return it with put_connection() in a finally block,
    or use the get_db_conn() context manager below.
    """
    return _pool.getconn()


def put_connection(conn) -> None:
    """Return a borrowed connection back to the pool."""
    _pool.putconn(conn)


class get_db_conn:
    """
    Context manager for safe pool usage:

        with get_db_conn() as conn:
            cur = conn.cursor()
            ...

    The connection is always returned to the pool on exit,
    even if an exception is raised.
    """
    def __enter__(self):
        self.conn = _pool.getconn()
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        _pool.putconn(self.conn)
        return False   # do not suppress exceptions