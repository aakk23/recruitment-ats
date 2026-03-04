# repositories/application_repository.py
import psycopg2.errors
from typing import Optional
from db import get_db_conn

# ALLOWED_STAGES removed — driven by workflow_stages table via stage_repository.py


def find_application(candidate_id: int, role_id: int):
    """Returns (application_id,) if an application exists for this candidate+role, else None."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT id FROM applications WHERE candidate_id = %s AND role_id = %s",
                (candidate_id, role_id),
            )
            return cur.fetchone()
        finally:
            cur.close()


def create_application(candidate_id: int, role_id: int, recruiter_id: int) -> dict:
    """Inserts a new application at stage 'new'. Raises ValueError on duplicate."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO applications (candidate_id, role_id, recruiter_id, stage)
                VALUES (%s, %s, %s, 'new')
                RETURNING id, stage
                """,
                (candidate_id, role_id, recruiter_id),
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


def update_stage(application_id: int, new_stage: str) -> Optional[dict]:
    """Updates stage. Returns updated dict or None if not found."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                UPDATE applications
                SET stage = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, stage
                """,
                (new_stage, application_id),
            )
            result = cur.fetchone()
            conn.commit()
            return {"id": result[0], "stage": result[1]} if result else None
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def list_applications_for_role(
    role_id: int,
    stage: Optional[str] = None,
    limit: int = 50,
    cursor: Optional[int] = None,
) -> dict:
    """
    Paginated applications for a role (keyset on created_at DESC, id DESC).
    Returns {"items": [...], "next_cursor": int|null}
    """
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            params = [role_id]
            cursor_clause = ""
            if cursor:
                cur.execute(
                    "SELECT created_at, id FROM applications WHERE id = %s", (cursor,)
                )
                row = cur.fetchone()
                if row:
                    cursor_clause = "AND (a.created_at, a.id) < (%s, %s)"
                    params += [row[0], row[1]]

            stage_clause = ""
            if stage:
                stage_clause = "AND a.stage = %s"
                params.append(stage)

            params.append(limit + 1)

            cur.execute(
                f"""
                SELECT a.id, cand.full_name, cand.email, a.stage, rec.name, a.created_at, cand.id
                FROM applications a
                JOIN candidates cand ON a.candidate_id = cand.id
                JOIN recruiters rec  ON a.recruiter_id = rec.id
                WHERE a.role_id = %s
                {cursor_clause}
                {stage_clause}
                ORDER BY a.created_at DESC, a.id DESC
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
                        "application_id": r[0],
                        "candidate_name": r[1],
                        "email": r[2],
                        "stage": r[3],
                        "recruiter": r[4],
                        "candidate_id": r[6],   # needed by frontend to call GET /candidates/{id}
                    }
                    for r in page
                ],
                "next_cursor": page[-1][0] if has_more else None,
            }
        finally:
            cur.close()


def delete_application(application_id: int) -> bool:
    """Returns True if deleted, False if not found."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                "DELETE FROM applications WHERE id = %s RETURNING id",
                (application_id,),
            )
            deleted = cur.fetchone()
            conn.commit()
            return deleted is not None
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


# ── Comments ──────────────────────────────────────────────────────────────────

def application_exists(application_id: int) -> bool:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("SELECT id FROM applications WHERE id = %s", (application_id,))
            return cur.fetchone() is not None
        finally:
            cur.close()


def add_comment(application_id: int, recruiter_id: int, comment: str) -> dict:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO application_comments (application_id, recruiter_id, comment)
                VALUES (%s, %s, %s)
                RETURNING id, comment
                """,
                (application_id, recruiter_id, comment),
            )
            row = cur.fetchone()
            conn.commit()
            return {"id": row[0], "comment": row[1]}
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def list_comments(application_id: int) -> list:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                SELECT c.id, c.comment, r.name, c.created_at
                FROM application_comments c
                JOIN recruiters r ON c.recruiter_id = r.id
                WHERE c.application_id = %s
                ORDER BY c.created_at DESC
                """,
                (application_id,),
            )
            rows = cur.fetchall()
            return [
                {"id": r[0], "comment": r[1], "recruiter": r[2], "created_at": r[3]}
                for r in rows
            ]
        finally:
            cur.close()