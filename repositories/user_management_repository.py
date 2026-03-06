from secrets import token_urlsafe
from typing import Optional

from db import get_db_conn
from auth import hash_password
from psycopg2.extras import Json


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


def _assert_user_role_schema(cur):
    if not _table_exists(cur, "user_roles"):
        raise ValueError("user_roles table is missing. Please run the RBAC migration.")


def list_user_roles() -> list:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            if not _table_exists(cur, "user_roles"):
                return []
            cur.execute(
                """
                SELECT id, name, description, permissions, created_at
                FROM user_roles
                ORDER BY name ASC
                """
            )
            return [
                {
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "permissions": row[3] or [],
                    "created_at": row[4],
                }
                for row in cur.fetchall()
            ]
        finally:
            cur.close()


def create_user_role(name: str, description: Optional[str], permissions: list) -> dict:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            _assert_user_role_schema(cur)
            cur.execute(
                """
                INSERT INTO user_roles (name, description, permissions)
                VALUES (%s, %s, %s)
                RETURNING id, name, description, permissions, created_at
                """,
                (name, description, Json(permissions or [])),
            )
            row = cur.fetchone()
            conn.commit()
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "permissions": row[3] or [],
                "created_at": row[4],
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def update_user_role(role_id: int, fields: dict) -> Optional[dict]:
    if not fields:
        roles = list_user_roles()
        return next((r for r in roles if r["id"] == role_id), None)

    allowed = {"name", "description", "permissions"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        roles = list_user_roles()
        return next((r for r in roles if r["id"] == role_id), None)

    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            _assert_user_role_schema(cur)
            set_clause = []
            values = []
            for key, value in updates.items():
                if key == "permissions":
                    set_clause.append("permissions = %s")
                    values.append(Json(value or []))
                    continue
                set_clause.append(f"{key} = %s")
                values.append(value)

            values.append(role_id)
            cur.execute(
                f"""
                UPDATE user_roles
                SET {', '.join(set_clause)}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, name, description, permissions, created_at
                """,
                tuple(values),
            )
            row = cur.fetchone()
            if not row:
                conn.commit()
                return None
            conn.commit()
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "permissions": row[3] or [],
                "created_at": row[4],
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def delete_user_role(role_id: int) -> bool:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            _assert_user_role_schema(cur)
            cur.execute("DELETE FROM user_roles WHERE id = %s", (role_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            return deleted
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def list_users(search: Optional[str] = None, role_id: Optional[int] = None, status: Optional[str] = None) -> list:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            has_role_table = _table_exists(cur, "user_roles")
            has_role_id = _column_exists(cur, "recruiters", "role_id")
            has_status = _column_exists(cur, "recruiters", "is_active")
            has_department = _column_exists(cur, "recruiters", "department")
            has_last_login = _column_exists(cur, "recruiters", "last_login_at")
            has_created = _column_exists(cur, "recruiters", "created_at")

            select_parts = [
                "r.id",
                "r.name",
                "r.email",
                "r.is_admin",
                "r.role_id" if has_role_id else "NULL::int AS role_id",
                "ur.name AS role_name" if has_role_table and has_role_id else "NULL::text AS role_name",
                "r.department" if has_department else "NULL::text AS department",
                "r.is_active" if has_status else "TRUE AS is_active",
                "r.last_login_at" if has_last_login else "NULL::timestamp AS last_login_at",
                "r.created_at" if has_created else "NULL::timestamp AS created_at",
            ]

            query = f"SELECT {', '.join(select_parts)} FROM recruiters r"
            if has_role_table and has_role_id:
                query += " LEFT JOIN user_roles ur ON ur.id = r.role_id"

            where = []
            params = []
            if search:
                where.append("(LOWER(r.name) LIKE %s OR LOWER(r.email) LIKE %s)")
                like = f"%{search.lower()}%"
                params.extend([like, like])
            if role_id:
                if has_role_id:
                    where.append("r.role_id = %s")
                    params.append(role_id)
            if status in {"active", "disabled"} and has_status:
                where.append("r.is_active = %s")
                params.append(status == "active")

            if where:
                query += " WHERE " + " AND ".join(where)
            query += " ORDER BY r.name ASC"

            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            return [
                {
                    "id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "is_admin": row[3],
                    "role_id": row[4],
                    "role": row[5] or ("Admin" if row[3] else "—"),
                    "department": row[6],
                    "status": "active" if row[7] else "disabled",
                    "last_login": row[8],
                    "created_at": row[9],
                }
                for row in rows
            ]
        finally:
            cur.close()


def create_user(
    name: str,
    email: str,
    role_id: Optional[int],
    department: Optional[str],
    status: str,
    is_admin: bool = False,
) -> dict:
    temp_password = token_urlsafe(10)
    password_hash = hash_password(temp_password)
    is_active = status != "disabled"

    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            has_role_id = _column_exists(cur, "recruiters", "role_id")
            has_department = _column_exists(cur, "recruiters", "department")
            has_status = _column_exists(cur, "recruiters", "is_active")

            columns = ["name", "email", "password_hash", "is_admin"]
            values = [name, email, password_hash, is_admin]

            if has_role_id:
                columns.append("role_id")
                values.append(role_id)
            if has_department:
                columns.append("department")
                values.append(department)
            if has_status:
                columns.append("is_active")
                values.append(is_active)

            placeholders = ", ".join(["%s"] * len(columns))
            cur.execute(
                f"""
                INSERT INTO recruiters ({', '.join(columns)})
                VALUES ({placeholders})
                RETURNING id
                """,
                tuple(values),
            )
            user_id = cur.fetchone()[0]
            conn.commit()
            users = list_users()
            created = next((u for u in users if u["id"] == user_id), None)
            if created:
                created["temp_password"] = temp_password
            return created or {"id": user_id, "temp_password": temp_password}
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def update_user(user_id: int, fields: dict) -> Optional[dict]:
    allowed = {"name", "email", "role_id", "department", "status", "is_admin"}
    payload = {k: v for k, v in fields.items() if k in allowed}
    if not payload:
        users = list_users()
        return next((u for u in users if u["id"] == user_id), None)

    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            has_role_id = _column_exists(cur, "recruiters", "role_id")
            has_department = _column_exists(cur, "recruiters", "department")
            has_status = _column_exists(cur, "recruiters", "is_active")

            set_clause = []
            values = []

            for key, value in payload.items():
                if key == "role_id" and not has_role_id:
                    continue
                if key == "department" and not has_department:
                    continue
                if key == "status":
                    if not has_status:
                        continue
                    set_clause.append("is_active = %s")
                    values.append(value != "disabled")
                    continue
                set_clause.append(f"{key} = %s")
                values.append(value)

            if not set_clause:
                users = list_users()
                return next((u for u in users if u["id"] == user_id), None)

            values.append(user_id)
            cur.execute(
                f"UPDATE recruiters SET {', '.join(set_clause)} WHERE id = %s",
                tuple(values),
            )
            if cur.rowcount == 0:
                conn.commit()
                return None
            conn.commit()
            users = list_users()
            return next((u for u in users if u["id"] == user_id), None)
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def delete_user(user_id: int) -> bool:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM recruiters WHERE id = %s", (user_id,))
            deleted = cur.rowcount > 0
            conn.commit()
            return deleted
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def reset_user_password(user_id: int) -> Optional[dict]:
    temp_password = token_urlsafe(10)
    password_hash = hash_password(temp_password)

    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE recruiters SET password_hash = %s WHERE id = %s",
                (password_hash, user_id),
            )
            if cur.rowcount == 0:
                conn.commit()
                return None
            conn.commit()
            return {"id": user_id, "temp_password": temp_password}
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
