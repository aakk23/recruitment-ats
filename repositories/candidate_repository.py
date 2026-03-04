# repositories/candidate_repository.py
from typing import Optional
from db import get_db_conn


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