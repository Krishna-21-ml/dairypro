"""
Seed database with sample data for development/testing.
Run: python seed.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from passlib.context import CryptContext
import random

MONGODB_URL = "mongodb://localhost:27017"
DB_NAME = "dairy_management"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]

    print("🌱 Seeding database...")

    # Clear existing data
    await db.users.drop()
    await db.farmers.drop()
    await db.milk_entries.drop()
    await db.milk_prices.drop()
    await db.debts.drop()
    await db.inventory.drop()

    # ── Users ──────────────────────────────────────────
    users = [
        {
            "name": "Admin User",
            "email": "admin@dairy.com",
            "hashed_password": pwd_context.hash("Admin@123"),
            "role": "admin",
            "phone": "9999999999",
            "is_active": True,
            "language": "en",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Ravi Kumar",
            "email": "agent1@dairy.com",
            "hashed_password": pwd_context.hash("Agent@123"),
            "role": "agent",
            "phone": "9876543210",
            "is_active": True,
            "language": "te",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Suresh Babu",
            "email": "agent2@dairy.com",
            "hashed_password": pwd_context.hash("Agent@123"),
            "role": "agent",
            "phone": "9876543211",
            "is_active": True,
            "language": "ta",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
    ]

    user_results = await db.users.insert_many(users)
    admin_id = str(user_results.inserted_ids[0])
    agent1_id = str(user_results.inserted_ids[1])
    agent2_id = str(user_results.inserted_ids[2])
    print(f"✅ Created {len(users)} users")

    # ── Milk Prices ────────────────────────────────────
    prices = [
        {
            "milk_type": "buffalo",
            "price_per_fat_unit": 8.5,
            "effective_from": datetime.utcnow() - timedelta(days=30),
            "set_by": admin_id,
            "notes": "Standard buffalo milk rate",
            "created_at": datetime.utcnow()
        },
        {
            "milk_type": "cow",
            "price_per_fat_unit": 7.0,
            "effective_from": datetime.utcnow() - timedelta(days=30),
            "set_by": admin_id,
            "notes": "Standard cow milk rate",
            "created_at": datetime.utcnow()
        },
    ]
    await db.milk_prices.insert_many(prices)
    print(f"✅ Created {len(prices)} milk prices")

    # ── Farmers ────────────────────────────────────────
    farmer_names = [
        ("Venkat Rao", "9111111101", "A001"),
        ("Lakshmi Devi", "9111111102", "A002"),
        ("Murali Krishna", "9111111103", "A003"),
        ("Sarada Devi", "9111111104", "A004"),
        ("Ramesh Naidu", "9111111105", "A005"),
        ("Padma Latha", "9111111106", "B001"),
        ("Srinivas Reddy", "9111111107", "B002"),
        ("Bhavani Prasad", "9111111108", "B003"),
        ("Kavitha Rani", "9111111109", "B004"),
        ("Narayana Swamy", "9111111110", "B005"),
    ]

    farmers = []
    for i, (name, phone, card) in enumerate(farmer_names):
        agent_id = agent1_id if i < 5 else agent2_id
        farmers.append({
            "name": name,
            "phone": phone,
            "card_number": card,
            "address": f"Village {i+1}, District, State",
            "milk_type": "buffalo" if i % 3 != 0 else "cow",
            "agent_id": agent_id,
            "is_active": True,
            "bank_details": {
                "bank_name": "SBI",
                "account_number": f"1234567890{i:02d}",
                "ifsc_code": "SBIN0001234",
                "branch": "Main Branch"
            },
            "gps_location": {
                "latitude": 16.5 + random.uniform(-0.5, 0.5),
                "longitude": 80.6 + random.uniform(-0.5, 0.5)
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })

    farmer_results = await db.farmers.insert_many(farmers)
    farmer_ids = [str(fid) for fid in farmer_results.inserted_ids]
    print(f"✅ Created {len(farmers)} farmers")

    # ── Milk Entries (last 30 days) ────────────────────
    entries = []
    for day_offset in range(30):
        entry_date = datetime.utcnow() - timedelta(days=day_offset)
        for i, (farmer_id, farmer) in enumerate(zip(farmer_ids, farmers)):
            for shift in ["morning", "evening"]:
                if random.random() > 0.15:  # 85% collection rate
                    litres = round(random.uniform(2, 12), 1)
                    fat = round(random.uniform(3.5, 7.5), 1)
                    milk_type = farmer["milk_type"]
                    price_per_fat = 8.5 if milk_type == "buffalo" else 7.0
                    rate = fat * price_per_fat
                    amount = round(litres * rate, 2)
                    agent_id = farmer["agent_id"]

                    entries.append({
                        "farmer_id": farmer_id,
                        "card_number": farmer["card_number"],
                        "agent_id": agent_id,
                        "litres": litres,
                        "fat": fat,
                        "milk_type": milk_type,
                        "shift": shift,
                        "rate": round(rate, 2),
                        "amount": amount,
                        "date": entry_date.replace(
                            hour=6 if shift == "morning" else 18,
                            minute=random.randint(0, 59)
                        ),
                        "synced": True,
                        "created_at": datetime.utcnow()
                    })

    await db.milk_entries.insert_many(entries)
    print(f"✅ Created {len(entries)} milk entries")

    # ── Debts ──────────────────────────────────────────
    debts = []
    for farmer_id in farmer_ids[:5]:
        loan_amount = random.choice([5000, 10000, 15000, 20000])
        paid = random.uniform(0, loan_amount * 0.6)
        paid = round(paid, 2)
        balance = round(loan_amount - paid, 2)

        transactions = [
            {
                "type": "loan",
                "amount": loan_amount,
                "description": "Emergency loan",
                "date": datetime.utcnow() - timedelta(days=random.randint(20, 60)),
                "created_at": datetime.utcnow()
            }
        ]
        if paid > 0:
            transactions.append({
                "type": "repayment",
                "amount": paid,
                "description": "Partial repayment",
                "date": datetime.utcnow() - timedelta(days=random.randint(1, 15)),
                "created_at": datetime.utcnow()
            })

        debts.append({
            "farmer_id": farmer_id,
            "total_taken": float(loan_amount),
            "total_paid": paid,
            "balance": balance,
            "transactions": transactions,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })

    await db.debts.insert_many(debts)
    print(f"✅ Created {len(debts)} debt records")

    # ── Inventory ─────────────────────────────────────
    inventory_items = [
        {"name": "Cattle Feed - Premium", "category": "feed", "quantity": 500, "unit": "kg", "low_stock_threshold": 100, "price_per_unit": 25},
        {"name": "Maize Silage", "category": "feed", "quantity": 1200, "unit": "kg", "low_stock_threshold": 200, "price_per_unit": 8},
        {"name": "Mineral Mixture", "category": "feed", "quantity": 50, "unit": "kg", "low_stock_threshold": 20, "price_per_unit": 120},
        {"name": "Foot & Mouth Vaccine", "category": "medicine", "quantity": 8, "unit": "piece", "low_stock_threshold": 10, "price_per_unit": 450},
        {"name": "Mastitis Antibiotics", "category": "medicine", "quantity": 25, "unit": "piece", "low_stock_threshold": 15, "price_per_unit": 200},
        {"name": "Teat Dip Solution", "category": "medicine", "quantity": 15, "unit": "l", "low_stock_threshold": 5, "price_per_unit": 350},
        {"name": "Milking Buckets", "category": "equipment", "quantity": 12, "unit": "piece", "low_stock_threshold": 5, "price_per_unit": 800},
        {"name": "Milk Cans 40L", "category": "equipment", "quantity": 20, "unit": "piece", "low_stock_threshold": 8, "price_per_unit": 2500},
    ]

    for item in inventory_items:
        item["created_at"] = datetime.utcnow()
        item["updated_at"] = datetime.utcnow()

    await db.inventory.insert_many(inventory_items)
    print(f"✅ Created {len(inventory_items)} inventory items")

    client.close()
    print("\n🎉 Database seeded successfully!")
    print("\n📋 Login Credentials:")
    print("  Admin:  admin@dairy.com  / Admin@123")
    print("  Agent1: agent1@dairy.com / Agent@123")
    print("  Agent2: agent2@dairy.com / Agent@123")

if __name__ == "__main__":
    asyncio.run(seed())
