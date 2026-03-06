# auth.py
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from fastapi import HTTPException, Response, Cookie
from config import settings   # reads SECRET_KEY + ACCESS_TOKEN_EXPIRE_MINUTES from env



ALGORITHM = "HS256"
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 60 * 60 * 8  # 8 hours
TOKEN_TTL_MIN  = 60                  # JWT expires after 60 min
REFRESH_THRESHOLD_MIN = settings.refresh_threshold_minutes           # rotate if <15 min remaining


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode(),
        hashed_password.encode()
    )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=TOKEN_TTL_MIN)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


# def get_current_user(token: str = Depends(oauth2_scheme)) -> int:
#     try:
#         payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
#         user_id: Optional[str] = payload.get("sub")   # Optional[str] — Python 3.10 safe
#         if user_id is None:
#             raise HTTPException(status_code=401, detail="Invalid token")
#     except JWTError:
#         raise HTTPException(status_code=401, detail="Invalid token")
#     return int(user_id)

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,        # HTTPS only in production
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
        domain="localhost",   # set to your domain in production
    )

def decode_token(token: str) -> dict:
    """Decode without raising — returns payload or empty dict."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return {}

def get_current_user(
    response: Response,
    access_token: Optional[str] = Cookie(default=None),
) -> int:
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(access_token)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Sliding window: rotate cookie if token expires within threshold
    exp = payload.get("exp")
    if exp:
        remaining = datetime.utcfromtimestamp(exp) - datetime.utcnow()
        if remaining <= timedelta(minutes=REFRESH_THRESHOLD_MIN):
            new_token = create_access_token(data={"sub": user_id})
            set_auth_cookie(response, new_token)

    return int(user_id)