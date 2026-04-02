from fastapi import APIRouter, Depends, Query
from datetime import datetime
from typing import Optional
from bson import ObjectId

from app.core.dependencies import get_current_user, require_admin
from app.db.database import get_db

router = APIRouter()


@router.get("/monthly-income")
async def monthly_income_report(
    month: int = Query(..., ge=1, le=12),
    year:  int = Query(..., ge=2020),
    agent_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    start = datetime(year, month, 1)
    end   = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

    match = {"date": {"$gte": start, "$lt": end}}
    if agent_id:
        match["agent_id"] = agent_id
    elif current_user["role"] == "agent":
        match["agent_id"] = str(current_user["id"])   # FIX: was current_user["_id"]

    results = await db.milk_entries.aggregate([
        {"$match": match},
        {"$group": {
            "_id":          "$farmer_id",
            "total_litres": {"$sum": "$litres"},
            "total_amount": {"$sum": "$amount"},
            "avg_fat":      {"$avg": "$fat"},
            "entries":      {"$sum": 1}
        }},
        {"$sort": {"total_amount": -1}}
    ]).to_list(500)

    for r in results:
        farmer = None
        if r["_id"] and ObjectId.is_valid(r["_id"]):
            farmer = await db.farmers.find_one({"_id": ObjectId(r["_id"])})
        r["farmer_name"] = farmer["name"]        if farmer else "Unknown"
        r["card_number"] = farmer["card_number"] if farmer else ""

    return {
        "month":        month,
        "year":         year,
        "farmers":      results,
        "total_litres": sum(r["total_litres"] for r in results),
        "total_amount": sum(r["total_amount"] for r in results)
    }


@router.get("/agent-revenue")
async def agent_revenue_report(
    month: int = Query(..., ge=1, le=12),
    year:  int = Query(..., ge=2020),
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    start = datetime(year, month, 1)
    end   = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

    results = await db.milk_entries.aggregate([
        {"$match": {"date": {"$gte": start, "$lt": end}}},
        {"$group": {
            "_id":          "$agent_id",
            "total_litres": {"$sum": "$litres"},
            "total_revenue":{"$sum": "$amount"},
            "farmer_count": {"$addToSet": "$farmer_id"},
            "entries":      {"$sum": 1}
        }},
        {"$sort": {"total_revenue": -1}}
    ]).to_list(100)

    for r in results:
        agent = None
        if r["_id"] and ObjectId.is_valid(r["_id"]):
            agent = await db.users.find_one({"_id": ObjectId(r["_id"])})
        r["agent_name"]   = agent["name"] if agent else "Unknown"
        r["farmer_count"] = len(r["farmer_count"])

    return {"month": month, "year": year, "agents": results}
