# main.py
import os
from typing import Optional, List

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
    update_ownership,
    list_applications_for_role,
    delete_application,
    application_exists,
    add_comment,
    list_comments,
)
from repositories.role_repository import (
    list_roles,
    get_role_by_id,
    create_role,
    update_role,
    update_role_visibility,
    role_exists,
    list_clients,
)
from repositories.recruiter_repository import (
    find_recruiter_by_email,
    find_recruiter_by_id,
    list_recruiters,
)
from repositories.stage_repository import (
    get_stages_for_role,
    create_stage_for_role,
    get_allowed_stage_names,
    get_global_allowed_stage_names,
    create_substage,
    delete_substage,
)
from repositories.event_repository import get_events, log_event, RESUME_UPLOADED

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Maverick ATS", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

file_service = get_file_service()

ALLOWED_MIME_TYPES = {"application/pdf"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

ALLOWED_VISIBILITY = {"published", "internal", "closed"}
ALLOWED_JOB_TYPES  = {"full-time", "part-time", "contract", "freelance", "internship"}


def validate_resume(resume: UploadFile) -> bytes:
    if resume.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{resume.content_type}'. Only PDF resumes are accepted.",
        )
    file_bytes = resume.file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Resume exceeds 10 MB ({len(file_bytes)//(1024*1024)} MB uploaded).",
        )
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    return file_bytes


# ── Pydantic models ───────────────────────────────────────────────────────────

class CreateRoleRequest(BaseModel):
    title:         str            = Field(..., min_length=1, max_length=300)
    client_id:     int            = Field(..., gt=0)
    description:   Optional[str] = Field(default=None, max_length=10000)
    department:    Optional[str] = Field(default=None, max_length=100)
    min_exp:       Optional[float] = Field(default=None, ge=0, le=50)
    max_exp:       Optional[float] = Field(default=None, ge=0, le=50)
    min_salary:    Optional[int]  = Field(default=None, ge=0)
    max_salary:    Optional[int]  = Field(default=None, ge=0)
    job_type:      Optional[str]  = Field(default=None)
    company_name:  Optional[str]  = Field(default=None, max_length=200)
    about_company: Optional[str]  = Field(default=None, max_length=5000)
    skills:        Optional[List[str]] = Field(default=None)
    visibility:    str            = Field(default="internal")
    team_id:       Optional[int]  = Field(default=None, gt=0)

    @field_validator("visibility")
    @classmethod
    def check_visibility(cls, v):
        if v not in ALLOWED_VISIBILITY:
            raise ValueError(f"visibility must be one of {sorted(ALLOWED_VISIBILITY)}")
        return v

    @field_validator("job_type")
    @classmethod
    def check_job_type(cls, v):
        if v and v not in ALLOWED_JOB_TYPES:
            raise ValueError(f"job_type must be one of {sorted(ALLOWED_JOB_TYPES)}")
        return v


class UpdateVisibilityRequest(BaseModel):
    visibility: str

    @field_validator("visibility")
    @classmethod
    def check_visibility(cls, v):
        if v not in ALLOWED_VISIBILITY:
            raise ValueError(f"visibility must be one of {sorted(ALLOWED_VISIBILITY)}")
        return v


class UpdateRoleRequest(BaseModel):
    title:         Optional[str]       = Field(default=None, min_length=1, max_length=300)
    description:   Optional[str]       = Field(default=None, max_length=10000)
    department:    Optional[str]       = Field(default=None, max_length=100)
    min_exp:       Optional[float]     = Field(default=None, ge=0, le=50)
    max_exp:       Optional[float]     = Field(default=None, ge=0, le=50)
    min_salary:    Optional[int]       = Field(default=None, ge=0)
    max_salary:    Optional[int]       = Field(default=None, ge=0)
    job_type:      Optional[str]       = Field(default=None)
    company_name:  Optional[str]       = Field(default=None, max_length=200)
    about_company: Optional[str]       = Field(default=None, max_length=5000)
    skills:        Optional[List[str]] = Field(default=None)
    visibility:    Optional[str]       = Field(default=None)
    team_id:       Optional[int]       = Field(default=None, gt=0)

    @field_validator("visibility")
    @classmethod
    def check_vis(cls, v):
        if v and v not in {"published", "internal", "closed"}:
            raise ValueError("Invalid visibility")
        return v

    @field_validator("job_type")
    @classmethod
    def check_jt(cls, v):
        if v and v not in {"full-time", "part-time", "contract", "freelance", "internship"}:
            raise ValueError("Invalid job_type")
        return v


class CreateStageRequest(BaseModel):
    name:     str = Field(..., min_length=1, max_length=50)
    position: int = Field(..., ge=0)


class CreateSubstageRequest(BaseModel):
    name:     str = Field(..., min_length=1, max_length=100)
    position: int = Field(default=0, ge=0)


class CreateApplicationRequest(BaseModel):
    candidate_id:    int           = Field(..., gt=0)
    role_id:         int           = Field(..., gt=0)
    resume_filename: Optional[str] = Field(default=None, max_length=255)


class UpdateStageRequest(BaseModel):
    stage:       str            = Field(..., min_length=1, max_length=50)
    substage_id: Optional[int]  = Field(default=None, gt=0)

    @field_validator("stage")
    @classmethod
    def strip_stage(cls, v):
        return v.strip().lower()


class UpdateOwnershipRequest(BaseModel):
    candidate_owner_id:    Optional[int] = Field(default=None, gt=0)
    assigned_recruiter_id: Optional[int] = Field(default=None, gt=0)


class AddCommentRequest(BaseModel):
    comment:              str            = Field(..., min_length=1, max_length=2000)
    is_private:           bool           = Field(default=False)
    tagged_recruiter_ids: Optional[List[int]] = Field(default=None)

    @field_validator("comment")
    @classmethod
    def strip_comment(cls, v):
        return v.strip()


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = find_recruiter_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": str(user["id"])})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me")
def get_me(user_id: int = Depends(get_current_user)):
    user = find_recruiter_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Recruiters (for dropdowns) ────────────────────────────────────────────────

@app.get("/recruiters")
def get_recruiters(user_id: int = Depends(get_current_user)):
    return list_recruiters()


# ── Clients (for dropdowns) ───────────────────────────────────────────────────

@app.get("/clients")
def get_clients(user_id: int = Depends(get_current_user)):
    return list_clients()


# ── Roles ─────────────────────────────────────────────────────────────────────

@app.get("/roles")
def get_roles(
    status:     Optional[str] = None,
    visibility: Optional[str] = None,
    limit:      int           = Query(default=50, ge=1, le=200),
    cursor:     Optional[int] = Query(default=None),
):
    if status and status not in {"open", "closed"}:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed: open, closed")
    if visibility and visibility not in ALLOWED_VISIBILITY:
        raise HTTPException(status_code=400, detail=f"Invalid visibility. Allowed: {sorted(ALLOWED_VISIBILITY)}")
    return list_roles(status=status, visibility=visibility, limit=limit, cursor=cursor)


@app.post("/roles", status_code=201)
def post_role(body: CreateRoleRequest, user_id: int = Depends(get_current_user)):
    try:
        return create_role(
            title=body.title,
            client_id=body.client_id,
            description=body.description,
            department=body.department,
            min_exp=body.min_exp,
            max_exp=body.max_exp,
            min_salary=body.min_salary,
            max_salary=body.max_salary,
            job_type=body.job_type,
            company_name=body.company_name,
            about_company=body.about_company,
            skills=body.skills,
            visibility=body.visibility,
            team_id=body.team_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/roles/{role_id}")
def get_role(role_id: int, user_id: int = Depends(get_current_user)):
    role = get_role_by_id(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@app.patch("/roles/{role_id}")
def patch_role(
    role_id: int,
    body:    UpdateRoleRequest,
    user_id: int = Depends(get_current_user),
):
    if not role_exists(role_id):
        raise HTTPException(status_code=404, detail="Role not found")
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_role(role_id, fields)
    if not result:
        raise HTTPException(status_code=404, detail="Role not found")
    return result


@app.patch("/roles/{role_id}/visibility")
def patch_role_visibility(
    role_id: int,
    body:    UpdateVisibilityRequest,
    user_id: int = Depends(get_current_user),
):
    result = update_role_visibility(role_id, body.visibility)
    if not result:
        raise HTTPException(status_code=404, detail="Role not found")
    return result


# ── Stages ────────────────────────────────────────────────────────────────────

@app.get("/roles/{role_id}/stages")
def get_stages(role_id: int):
    if not role_exists(role_id):
        raise HTTPException(status_code=404, detail="Role not found")
    return get_stages_for_role(role_id)


@app.post("/roles/{role_id}/stages", status_code=201)
def post_stage(
    role_id: int,
    body:    CreateStageRequest,
    user_id: int = Depends(get_current_user),
):
    if not role_exists(role_id):
        raise HTTPException(status_code=404, detail="Role not found")
    try:
        return create_stage_for_role(role_id, body.name, body.position)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.post("/stages/{stage_id}/substages", status_code=201)
def post_substage(
    stage_id: int,
    body:     CreateSubstageRequest,
    user_id:  int = Depends(get_current_user),
):
    try:
        return create_substage(stage_id, body.name, body.position)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.delete("/substages/{substage_id}", status_code=204)
def remove_substage(substage_id: int, user_id: int = Depends(get_current_user)):
    if not delete_substage(substage_id):
        raise HTTPException(status_code=404, detail="Substage not found")


# ── Candidates ────────────────────────────────────────────────────────────────

@app.post("/candidates")
def post_candidate(
    full_name:    str           = Form(..., min_length=1, max_length=200),
    email:        Optional[str] = Form(default=None),
    phone:        Optional[str] = Form(default=None),
    linkedin_url: Optional[str] = Form(default=None),
    role_id:      int           = Form(..., gt=0),
    resume:       UploadFile    = File(...),
    user_id:      int           = Depends(get_current_user),
):
    file_bytes = validate_resume(resume)

    if email:
        existing = find_candidate_by_email(email)
        if existing:
            candidate_id  = existing[0]
            existing_app  = find_application(candidate_id, role_id)
            return {
                "status":         "email_exists",
                "candidate_id":   candidate_id,
                "application_id": existing_app[0] if existing_app else None,
            }

    candidate_id = create_candidate(full_name, email, phone, linkedin_url)
    stored_path  = file_service.save_resume(file_bytes, candidate_id)
    update_resume_path(candidate_id, stored_path)

    return {
        "status":          "created",
        "id":              candidate_id,
        "full_name":       full_name,
        "email":           email,
        "resume_filename": resume.filename or "resume.pdf",
    }


@app.get("/candidates/{candidate_id}")
def get_candidate(candidate_id: int, user_id: int = Depends(get_current_user)):
    candidate = get_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.get("resume_path"):
        candidate["resume_url"] = file_service.get_resume_url(candidate["resume_path"])
    else:
        candidate["resume_url"] = None
    return candidate


# ── Applications ──────────────────────────────────────────────────────────────

@app.post("/applications")
def post_application(body: CreateApplicationRequest, user_id: int = Depends(get_current_user)):
    if not role_exists(body.role_id):
        raise HTTPException(status_code=404, detail="Role not found")
    try:
        result = create_application(body.candidate_id, body.role_id, user_id)
        if body.resume_filename:
            log_event(
                application_id=result["id"],
                event_type=RESUME_UPLOADED,
                metadata={"filename": body.resume_filename},
                recruiter_id=user_id,
            )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/roles/{role_id}/applications")
def get_applications_for_role(
    role_id: int,
    stage:   Optional[str] = None,
    search:  Optional[str] = Query(default=None, max_length=200),
    limit:   int           = Query(default=50, ge=1, le=200),
    cursor:  Optional[int] = Query(default=None),
    user_id: int           = Depends(get_current_user),
):
    if stage:
        allowed = get_allowed_stage_names(role_id)
        if stage not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid stage. Allowed: {sorted(allowed)}")
    return list_applications_for_role(
        role_id=role_id, stage=stage, search=search, limit=limit, cursor=cursor
    )


@app.patch("/applications/{application_id}/stage")
def patch_application_stage(
    application_id: int,
    body:           UpdateStageRequest,
    user_id:        int = Depends(get_current_user),
):
    allowed = get_global_allowed_stage_names()
    if body.stage not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Allowed: {sorted(allowed)}")
    result = update_stage(
        application_id,
        body.stage,
        substage_id=body.substage_id,
        recruiter_id=user_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Application not found")
    return result


@app.patch("/applications/{application_id}/ownership")
def patch_ownership(
    application_id: int,
    body:           UpdateOwnershipRequest,
    user_id:        int = Depends(get_current_user),
):
    if not application_exists(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    result = update_ownership(
        application_id,
        candidate_owner_id=body.candidate_owner_id,
        assigned_recruiter_id=body.assigned_recruiter_id,
    )
    return result


@app.delete("/applications/{application_id}", status_code=204)
def remove_application(application_id: int, user_id: int = Depends(get_current_user)):
    if not delete_application(application_id):
        raise HTTPException(status_code=404, detail="Application not found")


# ── Events ────────────────────────────────────────────────────────────────────

@app.get("/applications/{application_id}/events")
def get_application_events(application_id: int, user_id: int = Depends(get_current_user)):
    if not application_exists(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    return get_events(application_id)


# ── Comments ──────────────────────────────────────────────────────────────────

@app.post("/applications/{application_id}/comments")
def post_comment(
    application_id: int,
    body:           AddCommentRequest,
    user_id:        int = Depends(get_current_user),
):
    if not application_exists(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    return add_comment(
        application_id,
        user_id,
        body.comment,
        is_private=body.is_private,
        tagged_recruiter_ids=body.tagged_recruiter_ids,
    )


@app.get("/applications/{application_id}/comments")
def get_comments(application_id: int, user_id: int = Depends(get_current_user)):
    return list_comments(application_id, viewer_recruiter_id=user_id)