# repositories/candidate_repository.py
from typing import Optional
from db import get_db_conn


def find_candidate_by_email(email: str):
    """Returns (candidate_id,) if a candidate with this email exists, else None."""
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
    resume_path: str = "",
) -> int:
    """Inserts a new candidate row and returns the new candidate_id."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO candidates (full_name, email, phone, resume_path)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (full_name, email, phone, resume_path),
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
    """Updates the resume_path for a given candidate."""
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
    """Returns full candidate profile or None if not found."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                SELECT id, full_name, email, phone, resume_path, created_at
                FROM candidates
                WHERE id = %s
                """,
                (candidate_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "full_name": row[1],
                "email": row[2],
                "phone": row[3],
                "resume_path": row[4],
                "created_at": row[5],
            }
        finally:
            cur.close()