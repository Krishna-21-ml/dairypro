from fastapi import APIRouter, Depends
from bson import ObjectId
from datetime import datetime
from app.core.dependencies import get_current_user
from app.db.database import get_db

router = APIRouter()


@router.get("")
async def get_notifications(current_user=Depends(get_current_user), db=Depends(get_db)):
    user_id = str(current_user["id"])   # FIX: was current_user["_id"]
    notifications = await db.notifications.find(
        {"user_id": user_id, "read": False}
    ).sort("created_at", -1).limit(20).to_list(20)

    for n in notifications:
        n["id"] = str(n["_id"])
        del n["_id"]

    return {"notifications": notifications, "count": len(notifications)}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )
    return {"message": "Marked as read"}
