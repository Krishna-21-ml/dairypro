from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from bson import ObjectId
import math

from app.models.schemas import FarmerCreate, FarmerUpdate, FarmerResponse, PaginatedResponse
from app.core.dependencies import get_current_user, require_admin, require_agent_or_admin
from app.db.database import get_db

router = APIRouter()


def serialize(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-safe dict — removes ObjectId _id"""
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    # Convert any remaining ObjectId values
    for k, v in list(doc.items()):
        if hasattr(v, '__class__') and v.__class__.__name__ == 'ObjectId':
            doc[k] = str(v)
    return doc


@router.get("", response_model=PaginatedResponse)
async def list_farmers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    agent_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    query = {}
    if search:
        query["$or"] = [
            {"name":        {"$regex": search, "$options": "i"}},
            {"phone":       {"$regex": search, "$options": "i"}},
            {"card_number": {"$regex": search, "$options": "i"}},
        ]
    if agent_id:
        query["agent_id"] = agent_id
    elif current_user["role"] == "agent":
        query["agent_id"] = str(current_user["id"])
    if is_active is not None:
        query["is_active"] = is_active

    total   = await db.farmers.count_documents(query)
    skip    = (page - 1) * limit
    farmers = await db.farmers.find(query).skip(skip).limit(limit).to_list(limit)
    farmers = [serialize(f) for f in farmers]

    return PaginatedResponse(
        items=farmers, total=total, page=page, limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0
    )


@router.post("", response_model=FarmerResponse, status_code=201)
async def create_farmer(
    farmer: FarmerCreate,
    current_user=Depends(require_agent_or_admin),
    db=Depends(get_db)
):
    existing = await db.farmers.find_one({"card_number": farmer.card_number})
    if existing:
        raise HTTPException(status_code=400, detail="Card number already exists")

    farmer_data = farmer.dict()
    farmer_data["created_at"] = datetime.utcnow()
    farmer_data["updated_at"] = datetime.utcnow()

    if not farmer_data.get("agent_id") and current_user["role"] == "agent":
        farmer_data["agent_id"] = str(current_user["id"])

    result = await db.farmers.insert_one(farmer_data)
    farmer_data["_id"] = result.inserted_id
    return FarmerResponse(**serialize(farmer_data))


@router.get("/{farmer_id}", response_model=FarmerResponse)
async def get_farmer(
    farmer_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    farmer = await db.farmers.find_one({"_id": ObjectId(farmer_id)})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return FarmerResponse(**serialize(farmer))


@router.put("/{farmer_id}", response_model=FarmerResponse)
async def update_farmer(
    farmer_id: str,
    farmer_update: FarmerUpdate,
    current_user=Depends(require_agent_or_admin),
    db=Depends(get_db)
):
    farmer = await db.farmers.find_one({"_id": ObjectId(farmer_id)})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    update_data = {k: v for k, v in farmer_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    await db.farmers.update_one({"_id": ObjectId(farmer_id)}, {"$set": update_data})
    updated = await db.farmers.find_one({"_id": ObjectId(farmer_id)})
    return FarmerResponse(**serialize(updated))


@router.delete("/{farmer_id}")
async def delete_farmer(
    farmer_id: str,
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    result = await db.farmers.delete_one({"_id": ObjectId(farmer_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return {"message": "Farmer deleted successfully"}


@router.get("/{farmer_id}/summary")
async def get_farmer_summary(
    farmer_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    now   = datetime.utcnow()
    month = month or now.month
    year  = year  or now.year
    start = datetime(year, month, 1)
    end   = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

    result = await db.milk_entries.aggregate([
        {"$match": {"farmer_id": farmer_id, "date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": None,
            "total_litres": {"$sum": "$litres"},
            "total_amount": {"$sum": "$amount"},
            "entry_count":  {"$sum": 1},
            "avg_fat":      {"$avg": "$fat"}
        }}
    ]).to_list(1)

    summary = result[0] if result else {}
    debt    = await db.debts.find_one({"farmer_id": farmer_id})

    return {
        "farmer_id":    farmer_id,
        "month":        month,
        "year":         year,
        "total_litres": summary.get("total_litres", 0),
        "total_amount": summary.get("total_amount", 0),
        "entry_count":  summary.get("entry_count", 0),
        "avg_fat":      round(summary.get("avg_fat", 0) or 0, 2),
        "debt_balance": debt.get("balance", 0) if debt else 0
    }
