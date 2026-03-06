# repositories/recruiter_repository.py
from typing import Optional
from db import get_db_conn


def _table_exists(cur, table_name: str) -> bool:
    cur.execute("SELECT to_regclass(%s)", (table_name,))
    return cur.fetchone()[0] is not None


def _column_exists(cur, table_name: str, column_name: str) -> bool:
    cur.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return cur.fetchone() is not None


def _build_recruiter_projection(cur):
    has_role_table = _table_exists(cur, "user_roles")
    has_role_id = _column_exists(cur, "recruiters", "role_id")
    has_active = _column_exists(cur, "recruiters", "is_active")

    select_fields = [
        "r.id",
        "r.name",
        "r.email",
        "r.password_hash",
        "r.is_admin",
        "r.department" if _column_exists(cur, "recruiters", "department") else "NULL::text AS department",
        "r.last_login_at" if _column_exists(cur, "recruiters", "last_login_at") else "NULL::timestamp AS last_login_at",
        "r.created_at" if _column_exists(cur, "recruiters", "created_at") else "NULL::timestamp AS created_at",
        "r.updated_at" if _column_exists(cur, "recruiters", "updated_at") else "NULL::timestamp AS updated_at",
        "r.role_id" if has_role_id else "NULL::int AS role_id",
        "r.is_active" if has_active else "TRUE AS is_active",
    ]

    join_clause = ""
    if has_role_table and has_role_id:
        select_fields.extend([
            "ur.name AS role_name",
            "ur.permissions AS role_permissions",
        ])
        join_clause = "LEFT JOIN user_roles ur ON ur.id = r.role_id"
    else:
        select_fields.extend([
            "NULL::text AS role_name",
            "'[]'::jsonb AS role_permissions",
        ])

    return ", ".join(select_fields), join_clause


def _row_to_recruiter_dict(row) -> dict:
    return {
        "id": row[0],
        "name": row[1],
        "email": row[2],
        "password_hash": row[3],
        "is_admin": row[4],
        "department": row[5],
        "last_login": row[6],
        "created_at": row[7],
        "updated_at": row[8],
        "role_id": row[9],
        "is_active": bool(row[10]),
        "role_name": row[11],
        "permissions": row[12] or [],
    }


def find_recruiter_by_email(email: str) -> Optional[dict]:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            projection, join_clause = _build_recruiter_projection(cur)
            cur.execute(
                f"""
                SELECT {projection}
                FROM recruiters r
                {join_clause}
                WHERE r.email = %s
                """,
                (email,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return _row_to_recruiter_dict(row)
        finally:
            cur.close()


def find_recruiter_by_id(recruiter_id: int) -> Optional[dict]:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            projection, join_clause = _build_recruiter_projection(cur)
            cur.execute(
                f"""
                SELECT {projection}
                FROM recruiters r
                {join_clause}
                WHERE r.id = %s
                """,
                (recruiter_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            recruiter = _row_to_recruiter_dict(row)
            recruiter.pop("password_hash", None)
            return recruiter
        finally:
            cur.close()


def list_recruiters() -> list:
    """Returns all recruiters for dropdowns (ownership, tagging, team assignment)."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("SELECT id, name, email FROM recruiters ORDER BY name ASC")
            return [{"id": r[0], "name": r[1], "email": r[2]} for r in cur.fetchall()]
        finally:
            cur.close()


def get_recruiter_password_hash(recruiter_id: int) -> Optional[str]:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT password_hash FROM recruiters WHERE id = %s",
                (recruiter_id,),
            )
            row = cur.fetchone()
            return row[0] if row else None
        finally:
            cur.close()


def update_recruiter_password(recruiter_id: int, password_hash: str) -> bool:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE recruiters SET password_hash = %s WHERE id = %s",
                (password_hash, recruiter_id),
            )
            updated = cur.rowcount > 0
            conn.commit()
            return updated
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
