# repositories/role_repository.py
from typing import Optional
from db import get_db_conn, get_connection


def list_roles(
    status: Optional[str] = None,
    visibility: Optional[str] = None,
    limit: int = 50,
    cursor: Optional[int] = None,
) -> dict:
    """Paginated roles list."""
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

            filters = ""
            if status:
                filters += " AND r.status = %s"
                params.append(status)
            if visibility:
                filters += " AND r.visibility = %s"
                params.append(visibility)

            params.append(limit + 1)

            cur.execute(
                f"""
                SELECT r.id, r.title, c.name AS client, r.status, r.visibility,
                       r.department, r.job_type, r.min_exp, r.max_exp,
                       r.min_salary, r.max_salary, r.skills,
                       rec.name AS team_name, r.created_at
                FROM roles r
                JOIN clients c ON r.client_id = c.id
                LEFT JOIN recruiters rec ON r.team_id = rec.id
                WHERE 1=1
                {cursor_clause}
                {filters}
                ORDER BY r.created_at DESC, r.id DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = cur.fetchall()
            has_more = len(rows) > limit
            page = rows[:limit]
            return {
                "items": [_row_to_list_item(r) for r in page],
                "next_cursor": page[-1][0] if has_more else None,
            }
        finally:
            cur.close()


def get_role_by_id(role_id: int) -> Optional[dict]:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                SELECT r.id, r.title, c.name AS client, r.client_id,
                       r.status, r.visibility, r.description,
                       r.department, r.job_type,
                       r.min_exp, r.max_exp,
                       r.min_salary, r.max_salary,
                       r.skills, r.company_name, r.about_company,
                       rec.id AS team_id, rec.name AS team_name,
                       r.created_at, r.updated_at
                FROM roles r
                JOIN clients c ON r.client_id = c.id
                LEFT JOIN recruiters rec ON r.team_id = rec.id
                WHERE r.id = %s
                """,
                (role_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id":           row[0],
                "title":        row[1],
                "client":       row[2],
                "client_id":    row[3],
                "status":       row[4],
                "visibility":   row[5],
                "description":  row[6],
                "department":   row[7],
                "job_type":     row[8],
                "min_exp":      float(row[9])  if row[9]  is not None else None,
                "max_exp":      float(row[10]) if row[10] is not None else None,
                "min_salary":   row[11],
                "max_salary":   row[12],
                "skills":       row[13] or [],
                "company_name": row[14],
                "about_company":row[15],
                "team_id":      row[16],
                "team_name":    row[17],
                "created_at":   row[18],
                "updated_at":   row[19],
            }
        finally:
            cur.close()


def create_role(
    title: str,
    client_id: int,
    description=None,
    department=None,
    min_exp=None,
    max_exp=None,
    min_salary=None,
    max_salary=None,
    job_type=None,
    company_name=None,
    about_company=None,
    skills=None,
    visibility: str = "internal",
    team_id=None,
) -> dict:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO roles (
                    title, client_id, description, department,
                    min_exp, max_exp, min_salary, max_salary,
                    job_type, company_name, about_company,
                    skills, visibility, team_id, status
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, 'open'
                )
                RETURNING id
                """,
                (
                    title, client_id, description, department,
                    min_exp, max_exp, min_salary, max_salary,
                    job_type, company_name, about_company,
                    skills or [], visibility, team_id,
                ),
            )
            role_id = cur.fetchone()[0]
            conn.commit()
            return get_role_by_id(role_id)
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def update_role_visibility(role_id: int, visibility: str) -> Optional[dict]:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE roles SET visibility = %s, updated_at = NOW() WHERE id = %s RETURNING id",
                (visibility, role_id),
            )
            result = cur.fetchone()
            conn.commit()
            return get_role_by_id(role_id) if result else None
        except Exception:
            conn.rollback()
            raise
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


def list_clients() -> list:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("SELECT id, name FROM clients ORDER BY name ASC")
            return [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
        finally:
            cur.close()


def create_client(name: str) -> dict:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO clients (name) VALUES (%s) RETURNING id, name",
                (name,)
            )
            row = cur.fetchone()
            conn.commit()
            return {"id": row[0], "name": row[1]}
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()

def update_client(client_id: int, name: str) -> Optional[dict]:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE clients SET name = %s WHERE id = %s RETURNING id, name",
                (name, client_id)
            )
            row = cur.fetchone()
            if not row:
                return None
            conn.commit()
            return {"id": row[0], "name": row[1]}
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()


def _row_to_list_item(r) -> dict:
    return {
        "id":         r[0],
        "title":      r[1],
        "client":     r[2],
        "status":     r[3],
        "visibility": r[4],
        "department": r[5],
        "job_type":   r[6],
        "skills":     r[11] or [],
        "team_name":  r[12],
    }


# def update_role(role_id: int, fields: dict) -> dict | None:
def update_role(role_id: int, fields: dict) -> Optional[dict]:
    """
    Partial update — only keys present in `fields` are written.
    Allowed keys mirror the create_role signature.
    """
    ALLOWED = {
        "title", "description", "department",
        "min_exp", "max_exp", "min_salary", "max_salary",
        "job_type", "company_name", "about_company",
        "skills", "visibility", "team_id",
    }
    updates = {k: v for k, v in fields.items() if k in ALLOWED}
    if not updates:
        return get_role_by_id(role_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    values     = list(updates.values()) + [role_id]

    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                f"UPDATE roles SET {set_clause}, updated_at = NOW() WHERE id = %s RETURNING id",
                tuple(values),
            )
            result = cur.fetchone()
            conn.commit()
            return get_role_by_id(role_id) if result else None
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()