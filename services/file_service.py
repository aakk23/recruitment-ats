# services/file_service.py
"""
FileService — storage abstraction for resume uploads.

Current backend:  LocalStorageBackend  (saves to local disk, default)
Future backend:   S3Backend            (uploads to AWS S3, swap-in ready)

To switch backends set the environment variable:
    STORAGE_BACKEND=s3

For S3 you also need:
    AWS_ACCESS_KEY_ID=...
    AWS_SECRET_ACCESS_KEY=...
    AWS_REGION=ap-south-1          # or your region
    S3_BUCKET_NAME=maverick-resumes

No other file in the project needs to change when switching backends.
"""

import os
import abc


# ── Abstract base ─────────────────────────────────────────────────────────────

class StorageBackend(abc.ABC):
    @abc.abstractmethod
    def save(self, file_bytes: bytes, candidate_id: int, filename: str, content_type: str = "application/octet-stream") -> str:
        """
        Persist file_bytes and return a storage path / URL string
        that gets saved to candidates.resume_path in the DB.
        """
        ...

    @abc.abstractmethod
    def get_download_url(self, stored_path: str) -> str:
        """
        Given the stored_path returned by save(), return a URL
        the frontend can use to download the file.
        For local storage this is a relative path; for S3 a presigned URL.
        """
        ...


# ── Local disk backend (current behaviour) ────────────────────────────────────

class LocalStorageBackend(StorageBackend):
    """
    Saves files to  uploads/{candidate_id}/{filename}  on the local filesystem.
    Identical behaviour to the original hard-coded logic in main.py.
    """

    def __init__(self, base_dir: str = "uploads"):
        self.base_dir = base_dir

    def save(self, file_bytes: bytes, candidate_id: int, filename: str, content_type: str = "application/octet-stream") -> str:
        candidate_dir = os.path.join(self.base_dir, str(candidate_id))
        os.makedirs(candidate_dir, exist_ok=True)
        file_path = os.path.join(candidate_dir, filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return file_path  # stored as-is in DB

    def get_download_url(self, stored_path: str) -> str:
        # Served by authenticated API endpoint in main.py
        cleaned = stored_path.lstrip("/")
        return f"/files/{cleaned}"


# ── S3 backend (swap-in for production) ───────────────────────────────────────

class S3Backend(StorageBackend):
    """
    Uploads resumes to AWS S3.
    Requires:  pip install boto3
    Env vars:  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME
    """

    def __init__(self):
        try:
            import boto3
        except ImportError:
            raise RuntimeError(
                "boto3 is required for S3 storage. Run: pip install boto3"
            )

        self.s3 = boto3.client(
            "s3",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            region_name=os.environ.get("AWS_REGION", "ap-south-1"),
        )
        self.bucket = os.environ["S3_BUCKET_NAME"]

    def save(self, file_bytes: bytes, candidate_id: int, filename: str, content_type: str = "application/octet-stream") -> str:
        key = f"resumes/{candidate_id}/{filename}"
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return key  # stored in DB — use get_download_url() to make it accessible

    def get_download_url(self, stored_path: str, expires_in: int = 3600) -> str:
        """Returns a presigned URL valid for `expires_in` seconds (default 1 hour)."""
        return self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": stored_path},
            ExpiresIn=expires_in,
        )


# ── FileService facade ────────────────────────────────────────────────────────

class FileService:
    """
    Thin facade used by the route layer.
    The backend is injected at construction time (see get_file_service() below).
    """

    def __init__(self, backend: StorageBackend):
        self._backend = backend

    def save_resume(self, file_bytes: bytes, candidate_id: int) -> str:
        """Save resume bytes and return the stored path saved to the DB."""
        return self._backend.save(file_bytes, candidate_id, "resume.pdf", content_type="application/pdf")

    def save_candidate_file(
        self,
        file_bytes: bytes,
        candidate_id: int,
        filename: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Save candidate attachment with original filename/format."""
        return self._backend.save(file_bytes, candidate_id, filename, content_type=content_type)

    def get_resume_url(self, stored_path: str) -> str:
        """Return a download URL for the given stored path."""
        return self._backend.get_download_url(stored_path)


# ── Factory — reads STORAGE_BACKEND env var ───────────────────────────────────

def get_file_service() -> FileService:
    """
    Call this once at startup (or inject via FastAPI Depends).
    Reads STORAGE_BACKEND env var:
        local  →  LocalStorageBackend  (default)
        s3     →  S3Backend
    """
    backend_name = os.environ.get("STORAGE_BACKEND", "local").lower()

    if backend_name == "s3":
        backend = S3Backend()
    else:
        base_dir = os.environ.get("LOCAL_UPLOAD_DIR", "uploads")
        backend = LocalStorageBackend(base_dir=base_dir)

    return FileService(backend)
