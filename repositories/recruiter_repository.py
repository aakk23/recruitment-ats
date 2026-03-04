# repositories/recruiter_repository.py
from typing import Optional
from db import get_connection


def find_recruiter_by_email(email: str) -> Optional[dict]:
    """
    Returns {"id", "email", "password_hash"} or None.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, email, password_hash FROM recruiters WHERE email = %s",
            (email,)
        )
        row = cur.fetchone()
        if not row:
            return None
        return {"id": row[0], "email": row[1], "password_hash": row[2]}
    finally:
        cur.close()
        conn.close()


def find_recruiter_by_id(recruiter_id: int) -> Optional[dict]:
    """
    Returns {"id", "name", "email"} or None.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, name, email FROM recruiters WHERE id = %s",
            (recruiter_id,)
        )
        row = cur.fetchone()
        if not row:
            return None
        return {"id": row[0], "name": row[1], "email": row[2]}
    finally:
        cur.close()
        conn.close()