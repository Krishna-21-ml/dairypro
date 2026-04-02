from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from app.core.dependencies import get_current_user, require_admin
from app.db.database import get_db

router = APIRouter()


def serialize(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


@router.get("/admin")
async def admin_dashboard(current_user=Depends(require_admin), db=Depends(get_db)):
    now         = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    milk_result = await db.milk_entries.aggregate([
        {"$match": {"date": {"$gte": month_start}}},
        {"$group": {"_id": None,
            "total_litres": {"$sum": "$litres"},
            "total_income": {"$sum": "$amount"},
            "entry_count":  {"$sum": 1}
        }}
    ]).to_list(1)
    milk = milk_result[0] if milk_result else {}

    debt_result = await db.debts.aggregate([
        {"$group": {"_id": None, "total_debt": {"$sum": "$balance"}}}
    ]).to_list(1)
    total_debt = debt_result[0]["total_debt"] if debt_result else 0

    total_farmers = await db.farmers.count_documents({"is_active": True})
    total_agents  = await db.users.count_documents({"role": "agent", "is_active": True})

    trend = []
    for i in range(6, -1, -1):
        day       = now - timedelta(days=i)
        day_start = day.replace(hour=0,  minute=0,  second=0,  microsecond=0)
        day_end   = day.replace(hour=23, minute=59, second=59, microsecond=999999)
        r = await db.milk_entries.aggregate([
            {"$match": {"date": {"$gte": day_start, "$lte": day_end}}},
            {"$group": {"_id": None, "litres": {"$sum": "$litres"}, "income": {"$sum": "$amount"}}}
        ]).to_list(1)
        trend.append({
            "date":   day.strftime("%Y-%m-%d"),
            "litres": r[0]["litres"] if r else 0,
            "income": r[0]["income"] if r else 0
        })

    top_agents = await db.milk_entries.aggregate([
        {"$match": {"date": {"$gte": month_start}}},
        {"$group": {"_id": "$agent_id",
            "total_litres": {"$sum": "$litres"},
            "total_income": {"$sum": "$amount"}
        }},
        {"$sort": {"total_litres": -1}},
        {"$limit": 5}
    ]).to_list(5)

    low_stock = await db.inventory.find(
        {"$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}}
    ).to_list(10)
    low_stock = [serialize(i) for i in low_stock]

    return {
        "total_litres_month": milk.get("total_litres", 0),
        "total_income_month": milk.get("total_income", 0),
        "entry_count_month":  milk.get("entry_count", 0),
        "total_debt":         total_debt,
        "total_farmers":      total_farmers,
        "total_agents":       total_agents,
        "milk_trend":         trend,
        "top_agents":         top_agents,
        "low_stock_alerts":   low_stock
    }


@router.get("/agent")
async def agent_dashboard(current_user=Depends(get_current_user), db=Depends(get_db)):
    agent_id    = str(current_user["id"])
    now         = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    today_r = await db.milk_entries.aggregate([
        {"$match": {"agent_id": agent_id, "date": {"$gte": today_start}}},
        {"$group": {"_id": None, "litres": {"$sum": "$litres"}, "amount": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    today = today_r[0] if today_r else {}

    monthly_r = await db.milk_entries.aggregate([
        {"$match": {"agent_id": agent_id, "date": {"$gte": month_start}}},
        {"$group": {"_id": None, "litres": {"$sum": "$litres"}, "amount": {"$sum": "$amount"}}}
    ]).to_list(1)
    monthly = monthly_r[0] if monthly_r else {}

    farmer_count = await db.farmers.count_documents({"agent_id": agent_id, "is_active": True})

    trend = []
    for i in range(6, -1, -1):
        day       = now - timedelta(days=i)
        day_start = day.replace(hour=0,  minute=0,  second=0,  microsecond=0)
        day_end   = day.replace(hour=23, minute=59, second=59, microsecond=999999)
        r = await db.milk_entries.aggregate([
            {"$match": {"agent_id": agent_id, "date": {"$gte": day_start, "$lte": day_end}}},
            {"$group": {"_id": None, "litres": {"$sum": "$litres"}}}
        ]).to_list(1)
        trend.append({"date": day.strftime("%Y-%m-%d"), "litres": r[0]["litres"] if r else 0})

    return {
        "today_litres":   today.get("litres", 0),
        "today_amount":   today.get("amount", 0),
        "today_entries":  today.get("count", 0),
        "monthly_litres": monthly.get("litres", 0),
        "monthly_amount": monthly.get("amount", 0),
        "farmer_count":   farmer_count,
        "trend":          trend
    }


@router.get("/farmer")
async def farmer_dashboard(current_user=Depends(get_current_user), db=Depends(get_db)):
    farmer_id = current_user.get("farmer_id")
    if not farmer_id:
        return {"message": "No farmer profile linked",
                "monthly_litres": 0, "monthly_income": 0,
                "entry_count": 0, "debt_balance": 0, "recent_entries": []}

    now         = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    monthly_r = await db.milk_entries.aggregate([
        {"$match": {"farmer_id": farmer_id, "date": {"$gte": month_start}}},
        {"$group": {"_id": None,
            "litres":  {"$sum": "$litres"},
            "amount":  {"$sum": "$amount"},
            "entries": {"$sum": 1}
        }}
    ]).to_list(1)
    monthly = monthly_r[0] if monthly_r else {}

    debt   = await db.debts.find_one({"farmer_id": farmer_id})
    recent = await db.milk_entries.find({"farmer_id": farmer_id}).sort("date", -1).limit(5).to_list(5)
    recent = [serialize(e) for e in recent]

    return {
        "monthly_litres": monthly.get("litres", 0),
        "monthly_income": monthly.get("amount", 0),
        "entry_count":    monthly.get("entries", 0),
        "debt_balance":   debt.get("balance", 0) if debt else 0,
        "recent_entries": recent
    }
