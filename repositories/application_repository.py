# repositories/application_repository.py
import psycopg2.errors
from typing import Optional
from db import get_db_conn
from repositories.event_repository import (
    log_event,
    APPLICATION_CREATED,
    STAGE_CHANGED,
    COMMENT_ADDED,
)


def find_application(candidate_id: int, role_id: int):
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
            app_id, stage = row[0], row[1]
            log_event(
                application_id=app_id,
                event_type=APPLICATION_CREATED,
                metadata={"initial_stage": stage},
                recruiter_id=recruiter_id,
            )
            return {"id": app_id, "stage": stage}
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            raise ValueError("Candidate already applied to this role")
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def update_stage(
    application_id: int,
    new_stage: str,
    substage_id: Optional[int] = None,
    recruiter_id: Optional[int] = None,
) -> Optional[dict]:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("SELECT stage FROM applications WHERE id = %s", (application_id,))
            row = cur.fetchone()
            old_stage = row[0] if row else None

            cur.execute(
                """
                UPDATE applications
                SET stage = %s, substage_id = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, stage, substage_id
                """,
                (new_stage, substage_id, application_id),
            )
            result = cur.fetchone()
            conn.commit()
            if result:
                log_event(
                    application_id=application_id,
                    event_type=STAGE_CHANGED,
                    metadata={
                        "from_stage": old_stage,
                        "to_stage": new_stage,
                        "substage_id": substage_id,
                    },
                    recruiter_id=recruiter_id,
                )
            return {"id": result[0], "stage": result[1], "substage_id": result[2]} if result else None
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def update_ownership(
    application_id: int,
    candidate_owner_id: Optional[int] = None,
    assigned_recruiter_id: Optional[int] = None,
) -> Optional[dict]:
    """Update candidate owner and/or assigned recruiter."""
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                UPDATE applications
                SET candidate_owner_id = COALESCE(%s, candidate_owner_id),
                    assigned_recruiter_id = COALESCE(%s, assigned_recruiter_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
                """,
                (candidate_owner_id, assigned_recruiter_id, application_id),
            )
            result = cur.fetchone()
            conn.commit()
            return {"id": result[0]} if result else None
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def list_applications_for_role(
    role_id: int,
    stage: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    cursor: Optional[int] = None,
) -> dict:
    """Paginated applications with ownership fields, substage, search."""
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

            search_clause = ""
            if search:
                search_clause = "AND (cand.full_name ILIKE %s OR cand.email ILIKE %s)"
                params += [f"%{search}%", f"%{search}%"]

            params.append(limit + 1)

            cur.execute(
                f"""
                SELECT
                    a.id,
                    cand.full_name,
                    cand.email,
                    a.stage,
                    rec.name            AS recruiter,
                    a.created_at,
                    cand.id             AS candidate_id,
                    a.substage_id,
                    ss.name             AS substage_name,
                    owner.name          AS candidate_owner,
                    assigned.name       AS assigned_recruiter
                FROM applications a
                JOIN candidates  cand     ON a.candidate_id          = cand.id
                JOIN recruiters  rec      ON a.recruiter_id           = rec.id
                LEFT JOIN workflow_substages ss ON a.substage_id      = ss.id
                LEFT JOIN recruiters owner     ON a.candidate_owner_id = owner.id
                LEFT JOIN recruiters assigned  ON a.assigned_recruiter_id = assigned.id
                WHERE a.role_id = %s
                {cursor_clause}
                {stage_clause}
                {search_clause}
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
                        "application_id":     r[0],
                        "candidate_name":     r[1],
                        "email":              r[2],
                        "stage":              r[3],
                        "recruiter":          r[4],
                        "created_at":         r[5],
                        "candidate_id":       r[6],
                        "substage_id":        r[7],
                        "substage_name":      r[8],
                        "candidate_owner":    r[9],
                        "assigned_recruiter": r[10],
                    }
                    for r in page
                ],
                "next_cursor": page[-1][0] if has_more else None,
            }
        finally:
            cur.close()


def application_exists(application_id: int) -> bool:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("SELECT id FROM applications WHERE id = %s", (application_id,))
            return cur.fetchone() is not None
        finally:
            cur.close()


def delete_application(application_id: int) -> bool:
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

def add_comment(
    application_id: int,
    recruiter_id: int,
    comment: str,
    is_private: bool = False,
    tagged_recruiter_ids: Optional[list] = None,
) -> dict:
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO application_comments
                    (application_id, recruiter_id, comment, is_private, tagged_recruiter_ids)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, comment, is_private, tagged_recruiter_ids
                """,
                (application_id, recruiter_id, comment, is_private, tagged_recruiter_ids or []),
            )
            row = cur.fetchone()
            conn.commit()
            preview = comment[:80] + ("…" if len(comment) > 80 else "")
            log_event(
                application_id=application_id,
                event_type=COMMENT_ADDED,
                metadata={"preview": preview, "is_private": is_private},
                recruiter_id=recruiter_id,
            )
            return {
                "id":                   row[0],
                "comment":              row[1],
                "is_private":           row[2],
                "tagged_recruiter_ids": row[3],
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def list_comments(application_id: int, viewer_recruiter_id: Optional[int] = None) -> list:
    """
    Returns comments. Private comments only visible to the author or tagged recruiters.
    If viewer_recruiter_id is None (unauthenticated), only public comments returned.
    """
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                SELECT
                    c.id,
                    c.comment,
                    r.id          AS recruiter_id,
                    r.name        AS recruiter,
                    c.created_at,
                    c.is_private,
                    c.tagged_recruiter_ids,
                    ARRAY_AGG(tr.name) FILTER (WHERE tr.id IS NOT NULL) AS tagged_names
                FROM application_comments c
                JOIN recruiters r ON c.recruiter_id = r.id
                LEFT JOIN LATERAL UNNEST(c.tagged_recruiter_ids) AS tid ON TRUE
                LEFT JOIN recruiters tr ON tr.id = tid
                WHERE c.application_id = %s
                GROUP BY c.id, r.id, r.name
                ORDER BY c.created_at DESC
                """,
                (application_id,),
            )
            rows = cur.fetchall()
            result = []
            for row in rows:
                is_private = row[5]
                author_id = row[2]
                tagged = row[6] or []
                # filter private comments
                if is_private and viewer_recruiter_id is not None:
                    if viewer_recruiter_id != author_id and viewer_recruiter_id not in tagged:
                        continue
                elif is_private and viewer_recruiter_id is None:
                    continue
                result.append({
                    "id":                   row[0],
                    "comment":              row[1],
                    "recruiter_id":         row[2],
                    "recruiter":            row[3],
                    "created_at":           row[4],
                    "is_private":           row[5],
                    "tagged_recruiter_ids": row[6] or [],
                    "tagged_names":         [n for n in (row[7] or []) if n],
                })
            return result
        finally:
            cur.close()