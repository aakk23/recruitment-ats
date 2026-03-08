# repositories/candidate_repository.py
from typing import Optional
from db import get_db_conn
from psycopg2.extras import Json


def find_candidate_by_email(email: str):
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("SELECT id FROM candidates WHERE email = %s", (email,))
            return cur.fetchone()
        finally:
            cur.close()


def create_candidate(
    full_name: str,
    email: Optional[str],
    phone: Optional[str],
    linkedin_url: Optional[str] = None,
    resume_path: str = "",
) -> int:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO candidates (full_name, email, phone, linkedin_url, resume_path)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (full_name, email, phone, linkedin_url, resume_path),
            )
            candidate_id = cur.fetchone()[0]
            conn.commit()
            return candidate_id
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def update_resume_path(candidate_id: int, resume_path: str) -> None:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE candidates SET resume_path = %s WHERE id = %s",
                (resume_path, candidate_id),
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def get_candidate_by_id(candidate_id: int) -> Optional[dict]:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                SELECT id, full_name, email, phone, linkedin_url, resume_path, created_at
                FROM candidates
                WHERE id = %s
                """,
                (candidate_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id":           row[0],
                "full_name":    row[1],
                "email":        row[2],
                "phone":        row[3],
                "linkedin_url": row[4],
                "resume_path":  row[5],
                "created_at":   row[6],
            }
        finally:
            cur.close()


def list_candidates(
    search: Optional[str] = None,
    limit: int = 50,
    cursor: Optional[int] = None,
) -> dict:
    """Paginated candidates list with basic application aggregates."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            params = []
            cursor_clause = ""
            if cursor:
                cur.execute("SELECT created_at, id FROM candidates WHERE id = %s", (cursor,))
                row = cur.fetchone()
                if row:
                    cursor_clause = "AND (cand.created_at, cand.id) < (%s, %s)"
                    params += [row[0], row[1]]

            search_clause = ""
            if search:
                search_clause = "AND (cand.full_name ILIKE %s OR cand.email ILIKE %s)"
                params += [f"%{search}%", f"%{search}%"]

            params.append(limit + 1)

            cur.execute(
                f"""
                SELECT
                    cand.id,
                    cand.full_name,
                    cand.email,
                    cand.phone,
                    cand.linkedin_url,
                    cand.created_at,
                    COUNT(a.id) AS applications_count,
                    MAX(a.created_at) AS last_applied_at
                FROM candidates cand
                LEFT JOIN applications a ON a.candidate_id = cand.id
                WHERE 1=1
                {cursor_clause}
                {search_clause}
                GROUP BY cand.id
                ORDER BY cand.created_at DESC, cand.id DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = cur.fetchall()
            has_more = len(rows) > limit
            page = rows[:limit]
            return {
                "items": [
                    {
                        "id": r[0],
                        "full_name": r[1],
                        "email": r[2],
                        "phone": r[3],
                        "linkedin_url": r[4],
                        "created_at": r[5],
                        "applications_count": r[6] or 0,
                        "last_applied_at": r[7],
                    }
                    for r in page
                ],
                "next_cursor": page[-1][0] if has_more else None,
            }
        finally:
            cur.close()


def _get_column_type(cur, table_name: str, column_name: str) -> Optional[str]:
    cur.execute(
        """
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    row = cur.fetchone()
    return row[0] if row else None


def update_candidate_resume_metadata(candidate_id: int, skills: Optional[list], source: Optional[str]) -> None:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            set_parts = []
            values = []

            source_type = _get_column_type(cur, "candidates", "source")
            if source is not None and source_type:
                set_parts.append("source = %s")
                values.append(source)

            skills_type = _get_column_type(cur, "candidates", "skills")
            if skills is not None and skills_type:
                if skills_type == "ARRAY":
                    set_parts.append("skills = %s")
                    values.append(skills)
                else:
                    set_parts.append("skills = %s")
                    values.append(Json(skills))

            if not set_parts:
                return

            values.append(candidate_id)
            cur.execute(
                f"UPDATE candidates SET {', '.join(set_parts)} WHERE id = %s",
                tuple(values),
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
