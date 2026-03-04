# repositories/stage_repository.py
from db import get_connection


def get_stages_for_role(role_id: int) -> list:
    """
    Returns ordered stages for a role.
    Strategy:
      1. Look for role-specific stages first (role_id = given role_id).
      2. If none exist, fall back to global defaults (role_id IS NULL).
    Each item: {"name": str, "position": int}
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Try role-specific stages first
        cur.execute(
            """
            SELECT name, position
            FROM workflow_stages
            WHERE role_id = %s
            ORDER BY position ASC
            """,
            (role_id,)
        )
        rows = cur.fetchall()

        # Fall back to globals
        if not rows:
            cur.execute(
                """
                SELECT name, position
                FROM workflow_stages
                WHERE role_id IS NULL
                ORDER BY position ASC
                """
            )
            rows = cur.fetchall()

        return [{"name": row[0], "position": row[1]} for row in rows]
    finally:
        cur.close()
        conn.close()


def get_allowed_stage_names(role_id: int) -> set:
    """
    Returns a plain set of stage name strings for fast validation.
    e.g. {"new", "screening", "interview", "offered", "hired", "rejected"}
    """
    stages = get_stages_for_role(role_id)
    return {s["name"] for s in stages}


def get_global_allowed_stage_names() -> set:
    """
    Returns all distinct stage names across globals + all roles.
    Used by routes that don't have a role_id context (e.g. PATCH /stage).
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT DISTINCT name FROM workflow_stages")
        rows = cur.fetchall()
        return {row[0] for row in rows}
    finally:
        cur.close()
        conn.close()