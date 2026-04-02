from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
from typing import Optional
from bson import ObjectId
import math

from app.models.schemas import UserCreate, UserUpdate, UserResponse, PaginatedResponse
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, require_admin
from app.db.database import get_db

router = APIRouter()


def serialize(user: dict) -> dict:
    user["id"] = str(user["_id"])
    del user["_id"]
    user.pop("hashed_password", None)
    return user


@router.get("", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    query = {}
    if search:
        query["$or"] = [
            {"name":  {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if role:
        query["role"] = role

    total = await db.users.count_documents(query)
    skip  = (page - 1) * limit
    users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
    users = [serialize(u) for u in users]

    return PaginatedResponse(
        items=users, total=total, page=page, limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0
    )


@router.post("", status_code=201)
async def create_user(
    user: UserCreate,
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    existing = await db.users.find_one({"email": user.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user_data = user.dict(exclude={"password"})
    user_data["email"]           = user_data["email"].lower()
    user_data["hashed_password"] = get_password_hash(user.password)
    user_data["created_at"]      = datetime.utcnow()
    user_data["updated_at"]      = datetime.utcnow()

    result = await db.users.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    return serialize(user_data)


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    current_user.pop("hashed_password", None)
    return current_user


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    update: UserUpdate,
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    if str(current_user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}
