# main.py
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Body, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from config import settings
from auth import verify_password, create_access_token, get_current_user
from services.file_service import get_file_service

from repositories.candidate_repository import (
    find_candidate_by_email,
    create_candidate,
    update_resume_path,
)
from repositories.application_repository import (
    find_application,
    create_application,
    update_stage,
    list_applications_for_role,
    delete_application,
    application_exists,
    add_comment,
    list_comments,
)
from repositories.role_repository import list_roles, role_exists
from repositories.recruiter_repository import find_recruiter_by_email, find_recruiter_by_id
from repositories.stage_repository import (
    get_stages_for_role,
    get_allowed_stage_names,
    get_global_allowed_stage_names,
)


# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate FileService once at startup.
# Swap backend by setting STORAGE_BACKEND=s3 in your environment.
file_service = get_file_service()


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = find_recruiter_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": str(user["id"])})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me")
def get_me(user_id: int = Depends(get_current_user)):
    user = find_recruiter_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Roles ─────────────────────────────────────────────────────────────────────

@app.get("/roles")
def get_roles(
    status: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    cursor: Optional[int] = Query(default=None),
):
    if status and status not in {"open", "closed"}:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed values: open, closed")
    return list_roles(status=status, limit=limit, cursor=cursor)


# ── Stages ────────────────────────────────────────────────────────────────────

@app.get("/roles/{role_id}/stages")
def get_stages(role_id: int):
    if not role_exists(role_id):
        raise HTTPException(status_code=404, detail="Role not found")
    return get_stages_for_role(role_id)


# ── Candidates ────────────────────────────────────────────────────────────────

@app.post("/candidates")
def post_candidate(
    full_name: str = Form(...),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    role_id: int = Form(...),
    resume: UploadFile = File(...),
    user_id: int = Depends(get_current_user),
):
    # 1. Duplicate email check
    if email:
        existing = find_candidate_by_email(email)
        if existing:
            candidate_id = existing[0]
            existing_app = find_application(candidate_id, role_id)
            return {
                "status": "email_exists",
                "candidate_id": candidate_id,
                "application_id": existing_app[0] if existing_app else None,
            }

    # 2. Create candidate record (resume_path filled in after upload)
    candidate_id = create_candidate(full_name, email, phone)

    # 3. Save resume via FileService
    #    Swap STORAGE_BACKEND env var to move from local disk → S3 with zero code change
    file_bytes = resume.file.read()
    stored_path = file_service.save_resume(file_bytes, candidate_id)

    # 4. Persist the storage path returned by the backend
    update_resume_path(candidate_id, stored_path)

    return {"status": "created", "id": candidate_id, "full_name": full_name, "email": email}


# ── Applications ──────────────────────────────────────────────────────────────

@app.post("/applications")
def post_application(
    payload: dict = Body(...),
    user_id: int = Depends(get_current_user),
):
    candidate_id = payload.get("candidate_id")
    role_id = payload.get("role_id")

    if not candidate_id or not role_id:
        raise HTTPException(status_code=400, detail="candidate_id and role_id are required")

    if not role_exists(role_id):
        raise HTTPException(status_code=404, detail="Role not found")

    try:
        return create_application(candidate_id, role_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/roles/{role_id}/applications")
def get_applications_for_role(
    role_id: int,
    stage: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    cursor: Optional[int] = Query(default=None),
):
    if stage:
        allowed = get_allowed_stage_names(role_id)
        if stage not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid stage. Allowed stages: {sorted(allowed)}",
            )
    return list_applications_for_role(role_id=role_id, stage=stage, limit=limit, cursor=cursor)


@app.patch("/applications/{application_id}/stage")
def patch_application_stage(
    application_id: int,
    payload: dict = Body(...),
    user_id: int = Depends(get_current_user),
):
    new_stage = payload.get("stage")
    if not new_stage:
        raise HTTPException(status_code=400, detail="stage is required")

    allowed = get_global_allowed_stage_names()
    if new_stage not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage. Allowed stages: {sorted(allowed)}",
        )

    result = update_stage(application_id, new_stage)
    if not result:
        raise HTTPException(status_code=404, detail="Application not found")
    return result


@app.delete("/applications/{application_id}", status_code=204)
def remove_application(
    application_id: int,
    user_id: int = Depends(get_current_user),
):
    deleted = delete_application(application_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Application not found")


# ── Comments ──────────────────────────────────────────────────────────────────

@app.post("/applications/{application_id}/comments")
def post_comment(
    application_id: int,
    payload: dict = Body(...),
    user_id: int = Depends(get_current_user),
):
    comment = payload.get("comment")
    if not comment:
        raise HTTPException(status_code=400, detail="comment is required")
    if not application_exists(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    return add_comment(application_id, user_id, comment)


@app.get("/applications/{application_id}/comments")
def get_comments(application_id: int):
    return list_comments(application_id)