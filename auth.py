# auth.py
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from fastapi import HTTPException, Depends, Response, Cookie


from config import settings   # reads SECRET_KEY + ACCESS_TOKEN_EXPIRE_MINUTES from env



ALGORITHM = "HS256"
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 60 * 60 * 8  # 8 hours


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode(),
        hashed_password.encode(),
    )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
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
    )

def get_current_user(access_token: str = Cookie(default=None)) -> int:
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(access_token, settings.secret_key, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return int(user_id)