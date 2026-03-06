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
