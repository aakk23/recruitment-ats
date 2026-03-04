# repositories/stage_repository.py
from db import get_db_conn


def get_stages_for_role(role_id: int) -> list:
    """Returns ordered stages for a role, falling back to globals."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT name, position FROM workflow_stages WHERE role_id = %s ORDER BY position ASC",
                (role_id,),
            )
            rows = cur.fetchall()
            if not rows:
                cur.execute(
                    "SELECT name, position FROM workflow_stages WHERE role_id IS NULL ORDER BY position ASC"
                )
                rows = cur.fetchall()
            return [{"name": r[0], "position": r[1]} for r in rows]
        finally:
            cur.close()


def get_allowed_stage_names(role_id: int) -> set:
    return {s["name"] for s in get_stages_for_role(role_id)}


def get_global_allowed_stage_names() -> set:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("SELECT DISTINCT name FROM workflow_stages")
            return {r[0] for r in cur.fetchall()}
        finally:
            cur.close()