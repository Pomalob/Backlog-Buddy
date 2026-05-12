from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models import User, RefreshToken
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserOut
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/dev-token", response_model=TokenResponse, include_in_schema=False)
async def dev_token(session: AsyncSession = Depends(get_session)):
    """Dev-only: returns a valid token for the seeded dev user. Never expose in prod."""
    if settings.APP_ENV != "development":
        raise HTTPException(status_code=403, detail="Not in dev mode")
    user = (await session.execute(select(User).where(User.email == "dev@backlogbuddy.local"))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Dev user not found — run seed first")
    return await _issue_tokens(user, session)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    existing = (await session.execute(select(User).where(User.email == body.email))).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name or body.email.split("@")[0],
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return await _issue_tokens(user, session)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalars().first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return await _issue_tokens(user, session)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, session: AsyncSession = Depends(get_session)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    token_row = (await session.execute(
        select(RefreshToken).where(RefreshToken.token == body.refresh_token, RefreshToken.revoked == False)
    )).scalars().first()
    if not token_row or token_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")
    token_row.revoked = True
    session.add(token_row)
    user = await session.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return await _issue_tokens(user, session)


@router.post("/logout")
async def logout(body: RefreshRequest, session: AsyncSession = Depends(get_session)):
    token_row = (await session.execute(
        select(RefreshToken).where(RefreshToken.token == body.refresh_token)
    )).scalars().first()
    if token_row:
        token_row.revoked = True
        session.add(token_row)
        await session.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


async def _issue_tokens(user: User, session: AsyncSession) -> TokenResponse:
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    rt = RefreshToken(
        token=refresh,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    session.add(rt)
    await session.commit()
    return TokenResponse(access_token=access, refresh_token=refresh)
