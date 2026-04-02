from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from app.core.security import decode_token
from app.db.database import get_db
from app.models.schemas import UserRole

# FIX: auto_error=False prevents 403 on missing token (was causing "Not Authenticated" UI error)
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db)
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await db.users.find_one({"_id": user_id})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account deactivated")

    # FIX: always store as string "id", never ObjectId "_id"
    user["id"] = str(user["_id"])
    del user["_id"]
    return user


async def require_admin(current_user=Depends(get_current_user)):
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_agent_or_admin(current_user=Depends(get_current_user)):
    if current_user.get("role") not in [UserRole.ADMIN, UserRole.AGENT]:
        raise HTTPException(status_code=403, detail="Agent or Admin access required")
    return current_user
