# main.py
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from db import get_connection
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import timedelta
from auth import verify_password, create_access_token, get_current_user
from psycopg2.errors import UniqueViolation





app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = "uploads"

@app.post("/candidates")
def create_candidate(
    full_name: str = Form(...),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    role_id: int = Form(...),
    resume: UploadFile = File(...),
    user_id: int = Depends(get_current_user)
):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # 1. Check email uniqueness
        if email:
            cur.execute(
                "SELECT id FROM candidates WHERE email = %s",
                (email,)
            )
            existing = cur.fetchone()
            if existing:
                candidate_id = existing[0]
                cur.execute(
                    """SELECT id FROM applications
                       WHERE candidate_id = %s AND role_id = %s""",
                    (candidate_id, role_id)
                )
                app = cur.fetchone()

                # Return 200 with email_exists status (not 409 error)
                # Close resources before returning
                cur.close()
                conn.close()
                
                return {
                    "status": "email_exists",
                    "candidate_id": candidate_id,
                    "application_id": app[0] if app else None
                }

        # 2. Insert candidate (temporary resume path)
        cur.execute(
            """
            INSERT INTO candidates (full_name, email, phone, resume_path)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (full_name, email, phone, "")
        )
        candidate_id = cur.fetchone()[0]

        # 3. Save resume file
        candidate_dir = os.path.join(UPLOAD_DIR, str(candidate_id))
        os.makedirs(candidate_dir, exist_ok=True)

        file_path = os.path.join(candidate_dir, "resume.pdf")

        with open(file_path, "wb") as f:
            f.write(resume.file.read())

        # 4. Update resume path
        cur.execute(
            "UPDATE candidates SET resume_path = %s WHERE id = %s",
            (file_path, candidate_id)
        )

        conn.commit()

        return {
            "status": "created",
            "id": candidate_id,
            "full_name": full_name,
            "email": email
        }

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cur.close()
        conn.close()


from fastapi import Body
import psycopg2

@app.post("/applications")
def create_application(
        payload: dict = Body(...),
        user_id: int = Depends(get_current_user)
    ):



    candidate_id = payload.get("candidate_id")
    role_id = payload.get("role_id")

    if not candidate_id or not role_id:
        raise HTTPException(status_code=400, detail="candidate_id, role_id are required")

    conn = get_connection()
    cur = conn.cursor()

    try:
        # 1. Check candidate exists
        cur.execute("SELECT id FROM candidates WHERE id = %s", (candidate_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Candidate not found")

        # 2. Check role exists
        cur.execute("SELECT id FROM roles WHERE id = %s", (role_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Role not found")


        # 4. Create application
        cur.execute(
            """
            INSERT INTO applications (candidate_id, role_id, recruiter_id, stage)
            VALUES (%s, %s, %s, 'new')
            RETURNING id, stage
            """,
            (candidate_id, role_id, user_id)
        )

        app_id, stage = cur.fetchone()
        conn.commit()

        return {
            "id": app_id,
            "stage": stage
        }

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail="Candidate already applied to this role"
        )

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


ALLOWED_STAGES = {
    "new",
    "screening",
    "interview",
    "offered",
    "hired",
    "rejected"
}

@app.patch("/applications/{application_id}/stage")
def update_application_stage(
            application_id: int,
            payload: dict = Body(...),
            user_id: int = Depends(get_current_user)
        ):



    new_stage = payload.get("stage")

    if not new_stage:
        raise HTTPException(status_code=400, detail="stage is required")

    if new_stage not in ALLOWED_STAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage. Allowed stages: {sorted(ALLOWED_STAGES)}"
        )

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
        if not result:
            raise HTTPException(status_code=404, detail="Application not found")

        conn.commit()

        return {
            "id": result[0],
            "stage": result[1]
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()

@app.get("/roles")
def list_roles( status: Optional[str] = None ):
    conn = get_connection()
    cur = conn.cursor()

    try:
        if status:
            if status not in {'open', 'closed'}:
                raise HTTPException(status_code=400, detail="Invalid status. Allowed values: open, closed")
            
            cur.execute(
                 """
                 SELECT r.id, r.title, c.name, r.status
                 FROM roles r
                 JOIN clients c ON r.client_id = c.id
                 WHERE r.status = %s
                 ORDER BY r.created_at DESC
                 """,
                 (status,)
             )
        else:
            cur.execute(
                """
                SELECT r.id, r.title, c.name, r.status
                FROM roles r
                JOIN clients c ON r.client_id = c.id
                ORDER BY r.created_at DESC
                """
            )

        rows = cur.fetchall()

        return [
            {
                "id": row[0],
                "title": row[1],
                "client": row[2],
                "status": row[3]
            }
            for row in rows
        ]

    finally:
        cur.close()
        conn.close()

@app.get("/roles/{role_id}/applications")
def list_applications_for_role(role_id: int, stage: Optional[str] = None):
    conn = get_connection()
    cur = conn.cursor()


    try:
        query = """
            SELECT 
                a.id,
                cand.full_name,
                cand.email,
                a.stage,
                rec.name
            FROM applications a
            JOIN candidates cand ON a.candidate_id = cand.id
            JOIN recruiters rec ON a.recruiter_id = rec.id
            WHERE a.role_id = %s
            """
        params = [role_id]
        if stage:
            if stage not in ALLOWED_STAGES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid stage. Allowed stages: {sorted(ALLOWED_STAGES)}"
                )
            query += " AND a.stage = %s"
            params.append(stage)
        query += " ORDER BY a.created_at DESC"
            
        

        cur.execute(query, tuple(params))
        rows = cur.fetchall()

        return [
            {
                "application_id": row[0],
                "candidate_name": row[1],
                "email": row[2],
                "stage": row[3],
                "recruiter": row[4]
            }
            for row in rows
        ]

    finally:
        cur.close()
        conn.close()

@app.post("/applications/{application_id}/comments")
def add_comment(
            application_id: int,
            payload: dict = Body(...),
            user_id: int = Depends(get_current_user)
        ):



    
    comment = payload.get("comment")

    if not comment:
        raise HTTPException(
            status_code=400,
            detail="comment is required"
        )

    conn = get_connection()
    cur = conn.cursor()

    try:
        # check application exists
        cur.execute(
            "SELECT id FROM applications WHERE id = %s",
            (application_id,)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Application not found")


        cur.execute(
            """
            INSERT INTO application_comments (application_id, recruiter_id, comment)
            VALUES (%s, %s, %s)
            RETURNING id, comment
            """,
            (application_id, user_id, comment)
        )

        comment_id, text = cur.fetchone()
        conn.commit()

        return {
            "id": comment_id,
            "comment": text
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()

@app.get("/applications/{application_id}/comments")
def list_comments(application_id: int):
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
                "created_at": row[3]
            }
            for row in rows
        ]

    finally:
        cur.close()
        conn.close()


@app.delete("/applications/{application_id}", status_code=204)
def delete_application(application_id: int):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "DELETE FROM applications WHERE id = %s RETURNING id",
            (application_id,)
        )

        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Application not found")

        conn.commit()
        return

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, email, password_hash FROM recruiters WHERE email = %s",
        (form_data.username,)
    )
    user = cur.fetchone()

    cur.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id, email, password_hash = user

    if not verify_password(form_data.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": str(user_id)}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }



@app.get("/auth/me")
def get_me(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id, name, email FROM recruiters WHERE id = %s",
        (user_id,)
    )
    user = cur.fetchone()

    cur.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": user[0],
        "name": user[1],
        "email": user[2]
    }
