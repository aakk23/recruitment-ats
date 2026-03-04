# repositories/candidate_repository.py
from typing import Optional
from db import get_connection


def find_candidate_by_email(email: str):
    """
    Returns (candidate_id,) if a candidate with this email exists, else None.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id FROM candidates WHERE email = %s",
            (email,)
        )
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


def create_candidate(full_name: str, email: Optional[str], phone: Optional[str], resume_path: str = "") -> int:
    """
    Inserts a new candidate row and returns the new candidate_id.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO candidates (full_name, email, phone, resume_path)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (full_name, email, phone, resume_path)
        )
        candidate_id = cur.fetchone()[0]
        conn.commit()
        return candidate_id
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def update_resume_path(candidate_id: int, resume_path: str):
    """
    Updates the resume_path for a given candidate.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE candidates SET resume_path = %s WHERE id = %s",
            (resume_path, candidate_id)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()