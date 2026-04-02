from fastapi import APIRouter, HTTPException, Depends
from datetime import timedelta, datetime
from bson import ObjectId

from app.models.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.db.database import get_db

router = APIRouter()


def serialize_user(user: dict) -> dict:
    user["id"] = str(user["_id"])
    user["_id"] = str(user["_id"])
    return user


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db=Depends(get_db)):
    user = await db.users.find_one({"email": request.email.lower()})
    if not user or not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token(
        data={"sub": str(user["_id"]), "role": user["role"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    s = serialize_user(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": s["id"],
            "name": s.get("name", ""),
            "email": s.get("email", ""),
            "phone": s.get("phone"),
            "role": s.get("role"),
            "is_active": s.get("is_active", True),
            "language": s.get("language", "en"),
            "created_at": s.get("created_at", datetime.utcnow()).isoformat() if s.get("created_at") else datetime.utcnow().isoformat(),
            "farmer_id": s.get("farmer_id"),
        }
    }


@router.post("/register", status_code=201)
async def register(request: UserCreate, db=Depends(get_db)):
    existing = await db.users.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_data = request.dict(exclude={"password"})
    user_data["email"] = user_data["email"].lower()
    user_data["hashed_password"] = get_password_hash(request.password)
    user_data["created_at"] = datetime.utcnow()
    user_data["updated_at"] = datetime.utcnow()

    result = await db.users.insert_one(user_data)
    user_data["_id"] = result.inserted_id

    token = create_access_token(
        data={"sub": str(result.inserted_id), "role": user_data["role"]}
    )

    s = serialize_user(user_data)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": s["id"],
            "name": s.get("name", ""),
            "email": s.get("email", ""),
            "phone": s.get("phone"),
            "role": s.get("role"),
            "is_active": s.get("is_active", True),
            "language": s.get("language", "en"),
            "created_at": datetime.utcnow().isoformat(),
            "farmer_id": s.get("farmer_id"),
        }
    }