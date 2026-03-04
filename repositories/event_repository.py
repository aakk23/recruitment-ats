# repositories/event_repository.py
"""
All reads and writes for the application_events table.

log_event() is called from other repositories (application_repository)
and from main.py (resume_uploaded). It never raises — a failed event
log must never break the primary operation it's attached to.
"""

import json
import logging
from typing import Optional
from db import get_db_conn

logger = logging.getLogger(__name__)


# ── Event type constants ──────────────────────────────────────────────────────

APPLICATION_CREATED = "application_created"
STAGE_CHANGED       = "stage_changed"
COMMENT_ADDED       = "comment_added"
RESUME_UPLOADED     = "resume_uploaded"


# ── Write ─────────────────────────────────────────────────────────────────────

def log_event(
    application_id: int,
    event_type: str,
    metadata: dict,
    recruiter_id: Optional[int] = None,
) -> None:
    """
    Insert one event row. Silently swallows exceptions so a logging
    failure never aborts the calling transaction.
    """
    try:
        with get_db_conn() as conn:
            cur = conn.cursor()
            try:
                cur.execute(
                    """
                    INSERT INTO application_events
                        (application_id, recruiter_id, event_type, metadata)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (application_id, recruiter_id, event_type, json.dumps(metadata)),
                )
                conn.commit()
            finally:
                cur.close()
    except Exception as exc:  # pragma: no cover
        logger.warning("Failed to log event %s for application %s: %s",
                       event_type, application_id, exc)


# ── Read ──────────────────────────────────────────────────────────────────────

def get_events(application_id: int) -> list:
    """
    Returns all events for an application, newest first.
    Each row: { id, event_type, metadata, recruiter_name, created_at }
    """
    with get_db_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """
                SELECT
                    e.id,
                    e.event_type,
                    e.metadata,
                    r.name   AS recruiter_name,
                    e.created_at
                FROM application_events e
                LEFT JOIN recruiters r ON e.recruiter_id = r.id
                WHERE e.application_id = %s
                ORDER BY e.created_at DESC
                """,
                (application_id,),
            )
            rows = cur.fetchall()
            return [
                {
                    "id":             row[0],
                    "event_type":     row[1],
                    "metadata":       row[2],          # already a dict via psycopg2 JSONB
                    "recruiter_name": row[3],          # None for system events
                    "created_at":     row[4],
                }
                for row in rows
            ]
        finally:
            cur.close()