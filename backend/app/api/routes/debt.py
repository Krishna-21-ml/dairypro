from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId

from app.models.schemas import LoanCreate, RepaymentCreate
from app.core.dependencies import get_current_user, require_agent_or_admin
from app.db.database import get_db

router = APIRouter()


def serialize_debt(debt: dict) -> dict:
    debt["id"] = str(debt["_id"])
    del debt["_id"]
    return debt


@router.get("/{farmer_id}")
async def get_farmer_debt(
    farmer_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    debt = await db.debts.find_one({"farmer_id": farmer_id})
    if not debt:
        return {"farmer_id": farmer_id, "total_taken": 0, "total_paid": 0, "balance": 0, "transactions": []}
    return serialize_debt(debt)


@router.post("/loan", status_code=201)
async def add_loan(
    loan: LoanCreate,
    current_user=Depends(require_agent_or_admin),
    db=Depends(get_db)
):
    transaction = {
        "type": "loan",
        "amount": loan.amount,
        "description": loan.description,
        "date": loan.date,
        "created_at": datetime.utcnow()
    }
    existing = await db.debts.find_one({"farmer_id": loan.farmer_id})
    if existing:
        await db.debts.update_one(
            {"farmer_id": loan.farmer_id},
            {
                "$inc": {"total_taken": loan.amount, "balance": loan.amount},
                "$push": {"transactions": transaction},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    else:
        await db.debts.insert_one({
            "farmer_id": loan.farmer_id,
            "total_taken": loan.amount,
            "total_paid": 0,
            "balance": loan.amount,
            "transactions": [transaction],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
    return {"message": "Loan added successfully", "amount": loan.amount}


@router.post("/repayment", status_code=201)
async def add_repayment(
    repayment: RepaymentCreate,
    current_user=Depends(require_agent_or_admin),
    db=Depends(get_db)
):
    debt = None
    if ObjectId.is_valid(repayment.debt_id):
        debt = await db.debts.find_one({"_id": ObjectId(repayment.debt_id)})
    if not debt:
        debt = await db.debts.find_one({"farmer_id": repayment.debt_id})
    if not debt:
        raise HTTPException(status_code=404, detail="Debt record not found")
    if repayment.amount > debt["balance"]:
        raise HTTPException(
            status_code=400,
            detail=f"Repayment ({repayment.amount}) exceeds balance ({debt['balance']})"
        )

    transaction = {
        "type": "repayment",
        "amount": repayment.amount,
        "description": repayment.description,
        "date": repayment.date,
        "created_at": datetime.utcnow()
    }
    await db.debts.update_one(
        {"_id": debt["_id"]},
        {
            "$inc": {"total_paid": repayment.amount, "balance": -repayment.amount},
            "$push": {"transactions": transaction},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    return {"message": "Repayment recorded", "amount": repayment.amount}
