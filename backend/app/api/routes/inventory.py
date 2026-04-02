from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
from typing import Optional
from bson import ObjectId
import math

from app.models.schemas import InventoryCreate, InventoryUpdate, InventoryResponse, PaginatedResponse
from app.core.dependencies import get_current_user, require_admin
from app.db.database import get_db

router = APIRouter()


def serialize(doc: dict) -> dict:
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    doc["is_low_stock"] = doc.get("quantity", 0) <= doc.get("low_stock_threshold", 10)
    return doc


@router.get("", response_model=PaginatedResponse)
async def list_inventory(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock_only: bool = False,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    if low_stock_only:
        query["$expr"] = {"$lte": ["$quantity", "$low_stock_threshold"]}

    total = await db.inventory.count_documents(query)
    skip  = (page - 1) * limit
    items = await db.inventory.find(query).skip(skip).limit(limit).to_list(limit)
    items = [serialize(i) for i in items]

    return PaginatedResponse(
        items=items, total=total, page=page, limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0
    )


@router.post("", status_code=201)
async def create_item(
    item: InventoryCreate,
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    item_data = item.dict()
    item_data["created_at"] = datetime.utcnow()
    item_data["updated_at"] = datetime.utcnow()
    result = await db.inventory.insert_one(item_data)
    item_data["_id"] = result.inserted_id
    return serialize(item_data)


@router.put("/{item_id}")
async def update_item(
    item_id: str,
    update: InventoryUpdate,
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    result = await db.inventory.update_one({"_id": ObjectId(item_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    item = await db.inventory.find_one({"_id": ObjectId(item_id)})
    return serialize(item)


@router.delete("/{item_id}")
async def delete_item(
    item_id: str,
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    result = await db.inventory.delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}
