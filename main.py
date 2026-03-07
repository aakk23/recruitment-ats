# main.py
import os
import json
from typing import Optional, List


from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Query, Body, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator

from config import settings
from auth import verify_password, hash_password, create_access_token, get_current_user, set_auth_cookie
from services.file_service import get_file_service

from repositories.candidate_repository import (
    find_candidate_by_email,
    create_candidate,
    update_resume_path,
    get_candidate_by_id,
    update_candidate_resume_metadata,
)
from repositories.application_repository import (
    find_application,
    create_application,
    update_stage,
    update_ownership,
    list_applications_for_role,
    list_applications_for_candidate,
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
    create_client,
    update_client,
)
from repositories.recruiter_repository import (
    find_recruiter_by_email,
    find_recruiter_by_id,
    list_recruiters,
    get_recruiter_password_hash,
    update_recruiter_password,
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
from repositories.user_management_repository import (
    list_users,
    create_user,
    update_user,
    delete_user,
    reset_user_password,
    list_user_roles,
    create_user_role,
    update_user_role,
    delete_user_role,
)
from services.resume_parser import parse_resume_file, parse_resume_batch_files, ResumeParserError

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
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx"}

ALLOWED_VISIBILITY = {"published", "internal", "closed"}
ALLOWED_JOB_TYPES  = {"full-time", "part-time", "contract", "freelance", "internship"}
PERMISSION_ALIASES = {
    "users.view": {"users.view", "user:view"},
    "users.create": {"users.create", "user:create"},
    "users.edit": {"users.edit", "user:edit"},
    "users.delete": {"users.delete", "user:delete"},
    "settings.view": {"settings.view", "settings:view"},
    "settings.edit": {"settings.edit", "settings:edit"},
    "job:view": {"job:view", "jobs.view"},
    "job:create": {"job:create", "jobs.create"},
    "job:edit": {"job:edit", "jobs.edit"},
    "job:close": {"job:close", "jobs.close"},
    "job:delete": {"job:delete", "jobs.delete"},
    "candidate:view": {"candidate:view", "candidates.view"},
    "candidate:add": {"candidate:add", "candidates.add"},
    "candidate:edit": {"candidate:edit", "candidates.edit"},
    "candidate:move": {"candidate:move", "candidates.move_stage"},
    "candidate:delete": {"candidate:delete", "candidates.delete"},
    "comments:add": {"comments:add", "comments.create"},
    "comments:private:view": {"comments:private:view", "comments.view_private"},
}


def require_admin(user_id: int):
    """Raise 403 if the recruiter is not an admin."""
    # This function requires find_recruiter_by_id to be imported
    user = find_recruiter_by_id(user_id)
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


def require_permission(user_id: int, permission: str):
    user = find_recruiter_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("is_admin"):
        return
    permissions = set(user.get("permissions") or [])
    accepted = PERMISSION_ALIASES.get(permission, {permission})
    if permissions.intersection(accepted):
        return
    if permission.endswith(":view"):
        prefix = permission.split(":", 1)[0]
        if f"{prefix}:*" in permissions:
            return
    if permission.endswith(".view"):
        prefix = permission.split(".", 1)[0]
        if f"{prefix}.*" in permissions:
            return
    if "*" in permissions:
        return
    if not permissions.intersection(accepted):
        raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")


def require_admin_or_permission(user_id: int, permission: str):
    user = find_recruiter_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("is_admin"):
        return
    require_permission(user_id, permission)


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


def detect_resume_filetype(filename: Optional[str]) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="Resume filename is required")
    ext = os.path.splitext(filename.lower())[1]
    if ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported format. Only PDF and DOCX are allowed.")
    return ext


def validate_resume_for_parsing(resume: UploadFile) -> tuple[bytes, str]:
    ext = detect_resume_filetype(resume.filename)
    file_bytes = resume.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded resume is empty")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Resume exceeds 10 MB ({len(file_bytes)//(1024*1024)} MB uploaded).",
        )
    return file_bytes, ext


async def parse_single_resume_upload(resume: UploadFile) -> dict:
    file_bytes, _ = validate_resume_for_parsing(resume)
    try:
        return await run_in_threadpool(parse_resume_file, file_bytes, resume.filename or "")
    except ResumeParserError:
        raise
    except Exception:
        raise ResumeParserError("Failed to parse resume")


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


class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=3, max_length=255)
    role_id: Optional[int] = Field(default=None, gt=0)
    department: Optional[str] = Field(default=None, max_length=120)
    status: str = Field(default="active")
    is_admin: bool = Field(default=False)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in {"active", "disabled"}:
            raise ValueError("status must be active or disabled")
        return v


class UpdateUserRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    email: Optional[str] = Field(default=None, min_length=3, max_length=255)
    role_id: Optional[int] = Field(default=None, gt=0)
    department: Optional[str] = Field(default=None, max_length=120)
    status: Optional[str] = Field(default=None)
    is_admin: Optional[bool] = Field(default=None)
    reset_password: bool = Field(default=False)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v and v not in {"active", "disabled"}:
            raise ValueError("status must be active or disabled")
        return v


class CreateUserRoleRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    permissions: List[str] = Field(default_factory=list)


class UpdateUserRoleRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    permissions: Optional[List[str]] = Field(default=None)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=255)


# ── Auth ──────────────────────────────────────────────────────────────────────

# @app.post("/auth/login")
# def login(form_data: OAuth2PasswordRequestForm = Depends()):
#     user = find_recruiter_by_email(form_data.username)
#     if not user or not verify_password(form_data.password, user["password_hash"]):
#         raise HTTPException(status_code=401, detail="Invalid credentials")
#     token = create_access_token(data={"sub": str(user["id"])})
#     return {"access_token": token, "token_type": "bearer"}


# # @app.get("/auth/me")
# # def get_me(user_id: int = Depends(get_current_user)):
# #     user = find_recruiter_by_id(user_id)
# #     if not user:
# #         raise HTTPException(status_code=401, detail="User not found")
# #     return user

# @app.get("/auth/me")
# def get_me(user_id: int = Depends(get_current_user)):
#     conn = get_connection()
#     cur = conn.cursor()

#     cur.execute(
#         "SELECT id, name, email, is_admin FROM recruiters WHERE id = %s",
#         (user_id,)
#     )
#     user = cur.fetchone()

#     cur.close()
#     conn.close()

#     if not user:
#         raise HTTPException(status_code=401, detail="User not found")

#     return {
#         "id":       user[0],
#         "name":     user[1],
#         "email":    user[2],
#         "is_admin": user[3],
#     }



# @app.post("/auth/login")
# def login(form_data: OAuth2PasswordRequestForm = Depends()):
#     # This function requires find_recruiter_by_email to be imported
#     user = find_recruiter_by_email(form_data.username)
#     if not user or not verify_password(form_data.password, user["password_hash"]):
#         raise HTTPException(status_code=401, detail="Invalid credentials")
#     token = create_access_token(data={"sub": str(user["id"])})
#     return {"access_token": token, "token_type": "bearer"}

# /auth/login — set cookie, return only public user info
@app.post("/auth/login")
def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    user = find_recruiter_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("is_active") is False:
        raise HTTPException(status_code=403, detail="User is disabled")
    token = create_access_token(data={"sub": str(user["id"])})
    set_auth_cookie(response, token)
    return {"ok": True}   # ← no token in body

# /auth/refresh — rotate the cookie
@app.post("/auth/refresh")
def refresh(response: Response, user_id: int = Depends(get_current_user)):
    new_token = create_access_token(data={"sub": str(user_id)})
    set_auth_cookie(response, new_token)
    return {"ok": True}

# /auth/logout — clear the cookie
@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"ok": True}


@app.post("/auth/change-password")
def change_password(
    body: ChangePasswordRequest,
    user_id: int = Depends(get_current_user),
):
    current_hash = get_recruiter_password_hash(user_id)
    if not current_hash:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(body.current_password, current_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")

    updated = update_recruiter_password(user_id, hash_password(body.new_password))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}




@app.get("/auth/me")
def get_me(user_id: int = Depends(get_current_user)):
    user = find_recruiter_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/files/{stored_path:path}")
def get_resume_file(stored_path: str, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "candidate:view")

    base_dir = os.path.abspath(os.environ.get("LOCAL_UPLOAD_DIR", "uploads"))
    candidate_path = os.path.abspath(stored_path)
    if not os.path.commonpath([candidate_path, base_dir]) == base_dir:
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not os.path.isfile(candidate_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(candidate_path)


# ── Users & Custom Roles ─────────────────────────────────────────────────────

@app.get("/users")
def get_users(
    search: Optional[str] = Query(default=None, max_length=200),
    role_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),
    user_id: int = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "users.view")
    if status and status not in {"active", "disabled"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    return list_users(search=search, role_id=role_id, status=status)


@app.post("/users", status_code=201)
def post_user(body: CreateUserRequest, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "users.create")
    try:
        return create_user(
            name=body.name.strip(),
            email=body.email.strip().lower(),
            role_id=body.role_id,
            department=(body.department or "").strip() or None,
            status=body.status,
            is_admin=body.is_admin,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/users/{target_user_id}")
def patch_user(
    target_user_id: int,
    body: UpdateUserRequest,
    user_id: int = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "users.edit")

    if body.reset_password:
        reset = reset_user_password(target_user_id)
        if not reset:
            raise HTTPException(status_code=404, detail="User not found")
        return {"id": reset["id"], "temp_password": reset["temp_password"]}

    fields = {k: v for k, v in body.model_dump().items() if k != "reset_password" and v is not None}
    if "name" in fields:
        fields["name"] = fields["name"].strip()
    if "email" in fields:
        fields["email"] = fields["email"].strip().lower()
    if "department" in fields and fields["department"] is not None:
        fields["department"] = fields["department"].strip() or None

    updated = update_user(target_user_id, fields)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@app.delete("/users/{target_user_id}", status_code=204)
def remove_user(target_user_id: int, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "users.delete")
    if user_id == target_user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if not delete_user(target_user_id):
        raise HTTPException(status_code=404, detail="User not found")


@app.get("/user-roles")
def get_user_roles(user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "settings.view")
    return list_user_roles()


@app.post("/user-roles", status_code=201)
def post_user_role(body: CreateUserRoleRequest, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "settings.edit")
    try:
        return create_user_role(
            name=body.name.strip(),
            description=(body.description or "").strip() or None,
            permissions=body.permissions or [],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/user-roles/{role_id}")
def patch_user_role(
    role_id: int,
    body: UpdateUserRoleRequest,
    user_id: int = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "settings.edit")
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if "name" in fields:
        fields["name"] = fields["name"].strip()
    if "description" in fields and fields["description"] is not None:
        fields["description"] = fields["description"].strip() or None
    updated = update_user_role(role_id, fields)
    if not updated:
        raise HTTPException(status_code=404, detail="Role not found")
    return updated


@app.delete("/user-roles/{role_id}", status_code=204)
def remove_user_role(role_id: int, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "settings.edit")
    if not delete_user_role(role_id):
        raise HTTPException(status_code=404, detail="Role not found")


# ── Clients ───────────────────────────────────────────────────────────────────

# @app.get("/clients")
# def list_clients():
#     """Return all clients ordered by name. No auth required — used in dropdowns."""
#     conn = get_connection()
#     cur = conn.cursor()
#     try:
#         cur.execute("SELECT id, name FROM clients ORDER BY name ASC")
#         rows = cur.fetchall()
#         return [{"id": row[0], "name": row[1]} for row in rows]
#     finally:
#         cur.close()
#         conn.close()


# @app.post("/clients", status_code=201)
# def create_client(
#     payload: dict = Body(...),
#     user_id: int  = Depends(get_current_user),
# ):
#     """Create a new client. Admin only."""
#     require_admin(user_id)

#     name = (payload.get("name") or "").strip()
#     if not name:
#         raise HTTPException(status_code=400, detail="name is required")

#     conn = get_connection()
#     cur = conn.cursor()
#     try:
#         cur.execute(
#             "INSERT INTO clients (name) VALUES (%s) RETURNING id, name",
#             (name,)
#         )
#         row = cur.fetchone()
#         conn.commit()
#         return {"id": row[0], "name": row[1]}
#     except Exception as e:
#         conn.rollback()
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         cur.close()
#         conn.close()


# @app.patch("/clients/{client_id}")
# def update_client(
#     client_id: int,
#     payload: dict = Body(...),
#     user_id: int  = Depends(get_current_user),
# ):
#     """Rename a client. Admin only."""
#     require_admin(user_id)

#     name = (payload.get("name") or "").strip()
#     if not name:
#         raise HTTPException(status_code=400, detail="name is required")

#     conn = get_connection()
#     cur = conn.cursor()
#     try:
#         cur.execute(
#             "UPDATE clients SET name = %s WHERE id = %s RETURNING id, name",
#             (name, client_id)
#         )
#         row = cur.fetchone()
#         if not row:
#             raise HTTPException(status_code=404, detail="Client not found")
#         conn.commit()
#         return {"id": row[0], "name": row[1]}
#     except HTTPException:
#         raise
#     except Exception as e:
#         conn.rollback()
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         cur.close()
#         conn.close()

@app.get("/clients")
def get_clients(user_id: int = Depends(get_current_user)):
    return list_clients()


@app.post("/clients", status_code=201)
def post_client(
    payload: dict = Body(...),
    user_id: int  = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "settings.edit")
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    try:
        return create_client(name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/clients/{client_id}")
def patch_client(
    client_id: int,
    payload:   dict = Body(...),
    user_id:   int  = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "settings.edit")
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    result = update_client(client_id, name)
    if not result:
        raise HTTPException(status_code=404, detail="Client not found")
    return result










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
    user_id:    int           = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "job:view")
    if status and status not in {"open", "closed"}:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed: open, closed")
    if visibility and visibility not in ALLOWED_VISIBILITY:
        raise HTTPException(status_code=400, detail=f"Invalid visibility. Allowed: {sorted(ALLOWED_VISIBILITY)}")
    return list_roles(status=status, visibility=visibility, limit=limit, cursor=cursor)


@app.post("/roles", status_code=201)
def post_role(body: CreateRoleRequest, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "job:create")
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
    require_admin_or_permission(user_id, "job:view")
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
    require_admin_or_permission(user_id, "job:edit")
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
    require_admin_or_permission(user_id, "job:close")
    result = update_role_visibility(role_id, body.visibility)
    if not result:
        raise HTTPException(status_code=404, detail="Role not found")
    return result


# ── Stages ────────────────────────────────────────────────────────────────────

@app.get("/roles/{role_id}/stages")
def get_stages(role_id: int, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "job:view")
    if not role_exists(role_id):
        raise HTTPException(status_code=404, detail="Role not found")
    return get_stages_for_role(role_id)


@app.post("/roles/{role_id}/stages", status_code=201)
def post_stage(
    role_id: int,
    body:    CreateStageRequest,
    user_id: int = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "job:edit")
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
    require_admin_or_permission(user_id, "job:edit")
    try:
        return create_substage(stage_id, body.name, body.position)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.delete("/substages/{substage_id}", status_code=204)
def remove_substage(substage_id: int, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "job:edit")
    if not delete_substage(substage_id):
        raise HTTPException(status_code=404, detail="Substage not found")


# ── Candidates ────────────────────────────────────────────────────────────────

@app.post("/parse-resume")
async def parse_resume_endpoint(
    resume: UploadFile = File(...),
    job_id: Optional[int] = Form(default=None),
    user_id: int = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "candidate:add")
    try:
        parsed = await parse_single_resume_upload(resume)
    except ResumeParserError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse resume")

    return {
        **parsed,
        "job_id": job_id,
        "filename": resume.filename,
    }


@app.post("/bulk-parse-resumes")
async def bulk_parse_resumes_endpoint(
    resumes: List[UploadFile] = File(...),
    job_id: Optional[int] = Form(default=None),
    user_id: int = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "candidate:add")
    if not resumes:
        raise HTTPException(status_code=400, detail="At least one resume is required")

    valid_payloads = []
    valid_files = []
    errors = []

    for resume in resumes:
        try:
            file_bytes, _ = validate_resume_for_parsing(resume)
            valid_payloads.append({"bytes": file_bytes, "filename": resume.filename or ""})
            valid_files.append(resume)
        except HTTPException as e:
            errors.append({"filename": resume.filename, "error": e.detail})

    parsed_items = []
    if valid_payloads:
        try:
            parsed_results = await run_in_threadpool(parse_resume_batch_files, valid_payloads)
            for resume, parsed in zip(valid_files, parsed_results):
                parsed_items.append({
                    "filename": resume.filename,
                    "job_id": job_id,
                    "data": parsed,
                })
        except ResumeParserError as e:
            errors.extend({"filename": r.filename, "error": str(e)} for r in valid_files)
        except Exception:
            errors.extend({"filename": r.filename, "error": "Failed to parse resume"} for r in valid_files)

    return {
        "items": parsed_items,
        "errors": errors,
        "parsed_count": len(parsed_items),
        "error_count": len(errors),
    }


@app.post("/candidates/from-resume")
def post_candidate_from_resume(
    full_name: str = Form(..., min_length=1, max_length=200),
    email: Optional[str] = Form(default=None),
    phone: Optional[str] = Form(default=None),
    linkedin_url: Optional[str] = Form(default=None),
    source: str = Form(default="resume_upload"),
    skills: Optional[str] = Form(default=None),
    resume: UploadFile = File(...),
    user_id: int = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "candidate:add")
    file_bytes, _ = validate_resume_for_parsing(resume)

    parsed_skills = []
    if skills:
        try:
            loaded = json.loads(skills)
            if isinstance(loaded, list):
                parsed_skills = [str(item) for item in loaded]
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="skills must be a JSON list")

    if email:
        existing = find_candidate_by_email(email)
        if existing:
            raise HTTPException(status_code=409, detail="Candidate with this email already exists")

    candidate_id = create_candidate(
        full_name=full_name.strip(),
        email=(email or "").strip().lower() or None,
        phone=(phone or "").strip() or None,
        linkedin_url=(linkedin_url or "").strip() or None,
    )

    safe_ext = os.path.splitext((resume.filename or "resume.pdf").lower())[1] or ".pdf"
    stored_path = file_service.save_candidate_file(
        file_bytes=file_bytes,
        candidate_id=candidate_id,
        filename=f"resume{safe_ext}",
        content_type=resume.content_type or "application/octet-stream",
    )

    update_resume_path(candidate_id, stored_path)
    update_candidate_resume_metadata(candidate_id, parsed_skills, source)

    candidate = get_candidate_by_id(candidate_id)
    if candidate:
        candidate["resume_url"] = (
            file_service.get_resume_url(candidate["resume_path"]) if candidate.get("resume_path") else None
        )
        candidate["skills"] = parsed_skills
        candidate["source"] = source
    return candidate or {"id": candidate_id}


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
    require_admin_or_permission(user_id, "candidate:add")
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
    require_admin_or_permission(user_id, "candidate:view")
    candidate = get_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.get("resume_path"):
        candidate["resume_url"] = file_service.get_resume_url(candidate["resume_path"])
    else:
        candidate["resume_url"] = None
    return candidate


@app.get("/candidates/{candidate_id}/applications")
def get_applications_for_candidate(
    candidate_id: int,
    limit: int = Query(default=100, ge=1, le=200),
    cursor: Optional[int] = Query(default=None),
    user_id: int = Depends(get_current_user),
):
    require_admin_or_permission(user_id, "candidate:view")
    if not get_candidate_by_id(candidate_id):
        raise HTTPException(status_code=404, detail="Candidate not found")
    return list_applications_for_candidate(candidate_id=candidate_id, limit=limit, cursor=cursor)


# ── Applications ──────────────────────────────────────────────────────────────

@app.post("/applications")
def post_application(body: CreateApplicationRequest, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "candidate:add")
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
    require_admin_or_permission(user_id, "candidate:view")
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
    require_admin_or_permission(user_id, "candidate:move")
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
    require_admin_or_permission(user_id, "candidate:edit")
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
    require_admin_or_permission(user_id, "candidate:delete")
    if not delete_application(application_id):
        raise HTTPException(status_code=404, detail="Application not found")


# ── Events ────────────────────────────────────────────────────────────────────

@app.get("/applications/{application_id}/events")
def get_application_events(application_id: int, user_id: int = Depends(get_current_user)):
    require_admin_or_permission(user_id, "candidate:view")
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
    require_admin_or_permission(user_id, "comments:add")
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
    require_admin_or_permission(user_id, "candidate:view")
    return list_comments(application_id, viewer_recruiter_id=user_id)
