from fastapi import APIRouter, Depends
from datetime import datetime
from bson import ObjectId
from app.models.schemas import MilkPriceCreate, MilkPriceResponse, MilkType
from app.core.dependencies import get_current_user, require_admin
from app.db.database import get_db

router = APIRouter()


def serialize_price(p: dict) -> dict:
    p["id"] = str(p["_id"])
    del p["_id"]
    return p


@router.get("/current")
async def get_current_prices(db=Depends(get_db)):
    prices = {}
    for milk_type in [MilkType.COW, MilkType.BUFFALO]:
        price = await db.milk_prices.find_one(
            {"milk_type": milk_type},
            sort=[("effective_from", -1)]
        )
        if price:
            prices[milk_type] = serialize_price(price)
    return prices


@router.post("", response_model=MilkPriceResponse, status_code=201)
async def set_price(
    price: MilkPriceCreate,
    current_user=Depends(require_admin),
    db=Depends(get_db)
):
    price_data = price.dict()
    price_data["set_by"] = str(current_user["_id"])
    price_data["created_at"] = datetime.utcnow()
    result = await db.milk_prices.insert_one(price_data)
    price_data["_id"] = result.inserted_id
    return MilkPriceResponse(**serialize_price(price_data))


@router.get("/history")
async def price_history(
    milk_type: MilkType = MilkType.BUFFALO,
    limit: int = 30,
    db=Depends(get_db)
):
    prices = await db.milk_prices.find(
        {"milk_type": milk_type}
    ).sort("effective_from", -1).limit(limit).to_list(limit)
    return [serialize_price(p) for p in prices]
