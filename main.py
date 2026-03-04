# main.py
import os
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from config import settings
from auth import verify_password, create_access_token, get_current_user
from services.file_service import get_file_service

from repositories.candidate_repository import (
    find_candidate_by_email,
    create_candidate,
    update_resume_path,
    get_candidate_by_id,
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

app = FastAPI(title="Maverick ATS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

file_service = get_file_service()

# ── File upload constraints ───────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {"application/pdf"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_resume(resume: UploadFile) -> bytes:
    """
    Reads the file, enforces MIME type and size limits.
    Returns raw bytes so the caller doesn't re-read the stream.
    Raises HTTPException 400 on violation.
    """
    if resume.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{resume.content_type}'. Only PDF resumes are accepted.",
        )
    file_bytes = resume.file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Resume exceeds the 10 MB size limit ({len(file_bytes) // (1024*1024)} MB uploaded).",
        )
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded resume file is empty.")
    return file_bytes


# ── Pydantic request models ───────────────────────────────────────────────────

class CreateApplicationRequest(BaseModel):
    candidate_id: int = Field(..., gt=0)
    role_id: int = Field(..., gt=0)


class UpdateStageRequest(BaseModel):
    stage: str = Field(..., min_length=1, max_length=50)

    @field_validator("stage")
    @classmethod
    def strip_stage(cls, v: str) -> str:
        return v.strip().lower()


class AddCommentRequest(BaseModel):
    comment: str = Field(..., min_length=1, max_length=2000)

    @field_validator("comment")
    @classmethod
    def strip_comment(cls, v: str) -> str:
        return v.strip()


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
    full_name: str = Form(..., min_length=1, max_length=200),
    email: Optional[str] = Form(default=None),
    phone: Optional[str] = Form(default=None),
    role_id: int = Form(..., gt=0),
    resume: UploadFile = File(...),
    user_id: int = Depends(get_current_user),
):
    # Validate file (type + size) and read bytes once
    file_bytes = validate_resume(resume)

    # Duplicate email check
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

    # Create candidate + persist resume via FileService
    candidate_id = create_candidate(full_name, email, phone)
    stored_path = file_service.save_resume(file_bytes, candidate_id)
    update_resume_path(candidate_id, stored_path)

    return {"status": "created", "id": candidate_id, "full_name": full_name, "email": email}


@app.get("/candidates/{candidate_id}")
def get_candidate(
    candidate_id: int,
    user_id: int = Depends(get_current_user),
):
    """
    Returns full candidate profile including phone and resume path.
    Used by CandidatePanel to display complete details.
    """
    candidate = get_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Enrich with a download URL from the FileService
    if candidate.get("resume_path"):
        candidate["resume_url"] = file_service.get_resume_url(candidate["resume_path"])
    else:
        candidate["resume_url"] = None

    return candidate


# ── Applications ──────────────────────────────────────────────────────────────

@app.post("/applications")
def post_application(
    body: CreateApplicationRequest,
    user_id: int = Depends(get_current_user),
):
    if not role_exists(body.role_id):
        raise HTTPException(status_code=404, detail="Role not found")
    try:
        return create_application(body.candidate_id, body.role_id, user_id)
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
                detail=f"Invalid stage. Allowed: {sorted(allowed)}",
            )
    return list_applications_for_role(role_id=role_id, stage=stage, limit=limit, cursor=cursor)


@app.patch("/applications/{application_id}/stage")
def patch_application_stage(
    application_id: int,
    body: UpdateStageRequest,
    user_id: int = Depends(get_current_user),
):
    allowed = get_global_allowed_stage_names()
    if body.stage not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage. Allowed: {sorted(allowed)}",
        )
    result = update_stage(application_id, body.stage)
    if not result:
        raise HTTPException(status_code=404, detail="Application not found")
    return result


@app.delete("/applications/{application_id}", status_code=204)
def remove_application(
    application_id: int,
    user_id: int = Depends(get_current_user),
):
    if not delete_application(application_id):
        raise HTTPException(status_code=404, detail="Application not found")


# ── Comments ──────────────────────────────────────────────────────────────────

@app.post("/applications/{application_id}/comments")
def post_comment(
    application_id: int,
    body: AddCommentRequest,
    user_id: int = Depends(get_current_user),
):
    if not application_exists(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    return add_comment(application_id, user_id, body.comment)


@app.get("/applications/{application_id}/comments")
def get_comments(application_id: int):
    return list_comments(application_id)