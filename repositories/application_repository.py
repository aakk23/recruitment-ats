# repositories/application_repository.py
import psycopg2.errors
from typing import Optional
from db import get_connection

# ALLOWED_STAGES is no longer hardcoded here.
# Stage validation is now driven by the workflow_stages table
# via repositories/stage_repository.py


def find_application(candidate_id: int, role_id: int):
    """
    Returns (application_id,) if an application exists for this candidate+role, else None.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id FROM applications
            WHERE candidate_id = %s AND role_id = %s
            """,
            (candidate_id, role_id)
        )
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


def create_application(candidate_id: int, role_id: int, recruiter_id: int) -> dict:
    """
    Inserts a new application at stage 'new'. Returns {"id": ..., "stage": ...}.
    Raises ValueError on duplicate.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO applications (candidate_id, role_id, recruiter_id, stage)
            VALUES (%s, %s, %s, 'new')
            RETURNING id, stage
            """,
            (candidate_id, role_id, recruiter_id)
        )
        row = cur.fetchone()
        conn.commit()
        return {"id": row[0], "stage": row[1]}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise ValueError("Candidate already applied to this role")
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def update_stage(application_id: int, new_stage: str) -> Optional[dict]:
    """
    Updates stage on an application. Returns {"id": ..., "stage": ...} or None if not found.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            UPDATE applications
            SET stage = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, stage
            """,
            (new_stage, application_id)
        )
        result = cur.fetchone()
        conn.commit()
        return {"id": result[0], "stage": result[1]} if result else None
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def list_applications_for_role(
    role_id: int,
    stage: Optional[str] = None,
    limit: int = 50,
    cursor: Optional[int] = None,   # last seen application_id (exclusive)
) -> dict:
    """
    Returns a paginated page of applications for a role.

    Cursor strategy: keyset pagination on (created_at DESC, id DESC).
    The cursor is the application_id of the last item on the previous page.
    We resolve its created_at internally so the caller only tracks one value.

    Response shape:
    {
        "items": [...],
        "next_cursor": <int | null>   # pass as ?cursor= on next request; null = last page
    }
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        params = [role_id]

        # Resolve cursor row's (created_at, id) so we can use keyset comparison
        cursor_clause = ""
        if cursor:
            cur.execute(
                "SELECT created_at, id FROM applications WHERE id = %s",
                (cursor,)
            )
            row = cur.fetchone()
            if row:
                cursor_created_at, cursor_id = row
                # Fetch rows strictly older than cursor position
                cursor_clause = """
                    AND (a.created_at, a.id) < (%s, %s)
                """
                params += [cursor_created_at, cursor_id]

        stage_clause = ""
        if stage:
            stage_clause = " AND a.stage = %s"
            params.append(stage)

        # Fetch limit + 1 to know whether a next page exists
        params.append(limit + 1)

        query = f"""
            SELECT
                a.id,
                cand.full_name,
                cand.email,
                a.stage,
                rec.name,
                a.created_at
            FROM applications a
            JOIN candidates cand ON a.candidate_id = cand.id
            JOIN recruiters rec  ON a.recruiter_id = rec.id
            WHERE a.role_id = %s
            {cursor_clause}
            {stage_clause}
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT %s
        """

        cur.execute(query, tuple(params))
        rows = cur.fetchall()

        has_more = len(rows) > limit
        page_rows = rows[:limit]

        items = [
            {
                "application_id": r[0],
                "candidate_name": r[1],
                "email": r[2],
                "stage": r[3],
                "recruiter": r[4],
            }
            for r in page_rows
        ]

        next_cursor = page_rows[-1][0] if has_more else None  # last item's application_id

        return {"items": items, "next_cursor": next_cursor}

    finally:
        cur.close()
        conn.close()


def delete_application(application_id: int) -> bool:
    """
    Deletes an application. Returns True if deleted, False if not found.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM applications WHERE id = %s RETURNING id",
            (application_id,)
        )
        deleted = cur.fetchone()
        conn.commit()
        return deleted is not None
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


# ── Comments ──────────────────────────────────────────────────────────────────

def application_exists(application_id: int) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id FROM applications WHERE id = %s",
            (application_id,)
        )
        return cur.fetchone() is not None
    finally:
        cur.close()
        conn.close()


def add_comment(application_id: int, recruiter_id: int, comment: str) -> dict:
    """
    Inserts a comment and returns {"id": ..., "comment": ...}.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO application_comments (application_id, recruiter_id, comment)
            VALUES (%s, %s, %s)
            RETURNING id, comment
            """,
            (application_id, recruiter_id, comment)
        )
        row = cur.fetchone()
        conn.commit()
        return {"id": row[0], "comment": row[1]}
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def list_comments(application_id: int) -> list:
    """
    Returns all comments for an application, newest first.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                c.id,
                c.comment,
                r.name,
                c.created_at
            FROM application_comments c
            JOIN recruiters r ON c.recruiter_id = r.id
            WHERE c.application_id = %s
            ORDER BY c.created_at DESC
            """,
            (application_id,)
        )
        rows = cur.fetchall()
        return [
            {
                "id": row[0],
                "comment": row[1],
                "recruiter": row[2],
                "created_at": row[3],
            }
            for row in rows
        ]
    finally:
        cur.close()
        conn.close()