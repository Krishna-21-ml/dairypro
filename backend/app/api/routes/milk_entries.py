from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime
import math
from bson import ObjectId

from app.models.schemas import MilkEntryCreate, MilkEntryResponse, PaginatedResponse, MilkType
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.db.database import get_db

router = APIRouter()


def serialize_entry(e: dict) -> dict:
    e["id"] = str(e["_id"])
    del e["_id"]
    return e


async def calculate_amount(db, litres: float, fat: float, milk_type: MilkType) -> tuple:
    price_doc = await db.milk_prices.find_one(
        {"milk_type": milk_type},
        sort=[("effective_from", -1)]
    )
    if not price_doc:
        raise HTTPException(status_code=400, detail=f"No price set for {milk_type} milk. Please set a price first in Milk Prices page.")
    rate = fat * price_doc["price_per_fat_unit"]
    amount = round(litres * rate, 2)
    return round(rate, 2), amount


@router.get("", response_model=PaginatedResponse)
async def list_milk_entries(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    farmer_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    shift: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    query = {}
    if farmer_id:
        query["farmer_id"] = farmer_id
    if agent_id:
        query["agent_id"] = agent_id
    elif current_user["role"] == "agent":
        query["agent_id"] = str(current_user["id"])
    elif current_user["role"] == "farmer" and current_user.get("farmer_id"):
        query["farmer_id"] = current_user["farmer_id"]
    if shift:
        query["shift"] = shift
    if date_from or date_to:
        query["date"] = {}
        if date_from:
            query["date"]["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            query["date"]["$lte"] = datetime.fromisoformat(date_to)

    total = await db.milk_entries.count_documents(query)
    skip = (page - 1) * limit
    entries = await db.milk_entries.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    entries = [serialize_entry(e) for e in entries]

    return PaginatedResponse(
        items=entries, total=total, page=page, limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0
    )


@router.post("", response_model=MilkEntryResponse, status_code=201)
async def create_milk_entry(
    entry: MilkEntryCreate,
    current_user=Depends(require_agent_or_admin),
    db=Depends(get_db)
):
    farmer = await db.farmers.find_one({"_id": ObjectId(entry.farmer_id)})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    rate, amount = await calculate_amount(db, entry.litres, entry.fat, entry.milk_type)
    entry_data = entry.dict()
    entry_data["rate"] = rate
    entry_data["amount"] = amount
    entry_data["created_at"] = datetime.utcnow()
    entry_data["synced"] = True

    result = await db.milk_entries.insert_one(entry_data)
    entry_data["_id"] = result.inserted_id
    return MilkEntryResponse(**serialize_entry(entry_data))


@router.post("/bulk", status_code=201)
async def bulk_create_entries(
    entries: List[MilkEntryCreate],
    current_user=Depends(require_agent_or_admin),
    db=Depends(get_db)
):
    results = []
    errors = []
    for i, entry in enumerate(entries):
        try:
            rate, amount = await calculate_amount(db, entry.litres, entry.fat, entry.milk_type)
            entry_data = entry.dict()
            entry_data["rate"] = rate
            entry_data["amount"] = amount
            entry_data["created_at"] = datetime.utcnow()
            entry_data["synced"] = True
            results.append(entry_data)
        except Exception as e:
            errors.append({"index": i, "error": str(e)})

    if results:
        await db.milk_entries.insert_many(results)

    return {"inserted": len(results), "errors": errors}


@router.get("/daily-summary")
async def daily_summary(
    date: Optional[str] = None,
    agent_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    target_date = datetime.fromisoformat(date) if date else datetime.utcnow()
    start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

    match = {"date": {"$gte": start, "$lte": end}}
    if agent_id:
        match["agent_id"] = agent_id
    elif current_user["role"] == "agent":
        match["agent_id"] = str(current_user["id"])

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": "$shift",
            "total_litres": {"$sum": "$litres"},
            "total_amount": {"$sum": "$amount"},
            "count": {"$sum": 1},
            "avg_fat": {"$avg": "$fat"}
        }}
    ]
    results = await db.milk_entries.aggregate(pipeline).to_list(10)
    return {"date": target_date.isoformat(), "shifts": results}


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: str,
    current_user=Depends(require_agent_or_admin),
    db=Depends(get_db)
):
    result = await db.milk_entries.delete_one({"_id": ObjectId(entry_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted"}
