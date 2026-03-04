# repositories/role_repository.py
from typing import Optional
from db import get_db_conn


def list_roles(
    status: Optional[str] = None,
    limit: int = 50,
    cursor: Optional[int] = None,
) -> dict:
    """Paginated roles (keyset on created_at DESC, id DESC)."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            params = []
            cursor_clause = ""
            if cursor:
                cur.execute("SELECT created_at, id FROM roles WHERE id = %s", (cursor,))
                row = cur.fetchone()
                if row:
                    cursor_clause = "AND (r.created_at, r.id) < (%s, %s)"
                    params += [row[0], row[1]]

            status_clause = ""
            if status:
                status_clause = "AND r.status = %s"
                params.append(status)

            params.append(limit + 1)

            cur.execute(
                f"""
                SELECT r.id, r.title, c.name, r.status, r.created_at
                FROM roles r
                JOIN clients c ON r.client_id = c.id
                WHERE 1=1
                {cursor_clause}
                {status_clause}
                ORDER BY r.created_at DESC, r.id DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = cur.fetchall()
            has_more = len(rows) > limit
            page = rows[:limit]
            return {
                "items": [
                    {"id": r[0], "title": r[1], "client": r[2], "status": r[3]}
                    for r in page
                ],
                "next_cursor": page[-1][0] if has_more else None,
            }
        finally:
            cur.close()


def role_exists(role_id: int) -> bool:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("SELECT id FROM roles WHERE id = %s", (role_id,))
            return cur.fetchone() is not None
        finally:
            cur.close()