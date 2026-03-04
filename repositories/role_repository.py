# repositories/role_repository.py
from typing import Optional
from db import get_connection


def list_roles(
    status: Optional[str] = None,
    limit: int = 50,
    cursor: Optional[int] = None,   # last seen role_id (exclusive)
) -> dict:
    """
    Returns a paginated list of roles, optionally filtered by status.

    Cursor strategy: keyset pagination on (created_at DESC, id DESC).
    The cursor is the role_id of the last item on the previous page.

    Response shape:
    {
        "items": [...],
        "next_cursor": <int | null>
    }
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        params = []

        # Resolve cursor position
        cursor_clause = ""
        if cursor:
            cur.execute(
                "SELECT created_at, id FROM roles WHERE id = %s",
                (cursor,)
            )
            row = cur.fetchone()
            if row:
                cursor_created_at, cursor_id = row
                cursor_clause = "AND (r.created_at, r.id) < (%s, %s)"
                params += [cursor_created_at, cursor_id]

        status_clause = ""
        if status:
            status_clause = "AND r.status = %s"
            params.append(status)

        params.append(limit + 1)

        query = f"""
            SELECT r.id, r.title, c.name, r.status, r.created_at
            FROM roles r
            JOIN clients c ON r.client_id = c.id
            WHERE 1=1
            {cursor_clause}
            {status_clause}
            ORDER BY r.created_at DESC, r.id DESC
            LIMIT %s
        """

        cur.execute(query, tuple(params))
        rows = cur.fetchall()

        has_more = len(rows) > limit
        page_rows = rows[:limit]

        items = [
            {
                "id": r[0],
                "title": r[1],
                "client": r[2],
                "status": r[3],
            }
            for r in page_rows
        ]

        next_cursor = page_rows[-1][0] if has_more else None  # last item's role_id

        return {"items": items, "next_cursor": next_cursor}

    finally:
        cur.close()
        conn.close()


def role_exists(role_id: int) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM roles WHERE id = %s", (role_id,))
        return cur.fetchone() is not None
    finally:
        cur.close()
        conn.close()