# repositories/stage_repository.py
from typing import Optional
from db import get_db_conn


# ── Stages ────────────────────────────────────────────────────────────────────

def get_stages_for_role(role_id: int) -> list:
    """Returns ordered stages with their substages for a role, falling back to globals."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT id, name, position FROM workflow_stages WHERE role_id = %s ORDER BY position ASC",
                (role_id,),
            )
            rows = cur.fetchall()
            if not rows:
                cur.execute(
                    "SELECT id, name, position FROM workflow_stages WHERE role_id IS NULL ORDER BY position ASC"
                )
                rows = cur.fetchall()

            stages = []
            for r in rows:
                stage_id, name, position = r[0], r[1], r[2]
                substages = get_substages_for_stage(stage_id, cur=cur)
                stages.append({"id": stage_id, "name": name, "position": position, "substages": substages})
            return stages
        finally:
            cur.close()


def create_stage_for_role(role_id: int, name: str, position: int) -> dict:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO workflow_stages (role_id, name, position)
                VALUES (%s, %s, %s)
                ON CONFLICT (role_id, name) DO NOTHING
                RETURNING id, name, position
                """,
                (role_id, name.strip().lower(), position),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                raise ValueError(f"Stage '{name}' already exists for this role")
            return {"id": row[0], "name": row[1], "position": row[2], "substages": []}
        except Exception:
            conn.rollback()
            raise
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


# ── Substages ─────────────────────────────────────────────────────────────────

def get_substages_for_stage(stage_id: int, cur=None) -> list:
    """Returns substages for a stage. Accepts an existing cursor to avoid nested connections."""
    def _query(c):
        c.execute(
            "SELECT id, name, position FROM workflow_substages WHERE stage_id = %s ORDER BY position ASC",
            (stage_id,),
        )
        return [{"id": r[0], "name": r[1], "position": r[2]} for r in c.fetchall()]

    if cur is not None:
        return _query(cur)

    with get_db_conn() as conn:
        c = conn.cursor()
        try:
            return _query(c)
        finally:
            c.close()


def create_substage(stage_id: int, name: str, position: int) -> dict:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO workflow_substages (stage_id, name, position)
                VALUES (%s, %s, %s)
                ON CONFLICT (stage_id, name) DO NOTHING
                RETURNING id, name, position
                """,
                (stage_id, name.strip(), position),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                raise ValueError(f"Substage '{name}' already exists for this stage")
            return {"id": row[0], "name": row[1], "position": row[2]}
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def delete_substage(substage_id: int) -> bool:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "DELETE FROM workflow_substages WHERE id = %s RETURNING id",
                (substage_id,),
            )
            deleted = cur.fetchone()
            conn.commit()
            return deleted is not None
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()