from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.DATABASE_NAME]
        # Create indexes
        await create_indexes()
        logger.info("Connected to MongoDB successfully")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def disconnect_db():
    global client
    if client:
        client.close()
        logger.info("Disconnected from MongoDB")


async def get_db():
    return db


async def create_indexes():
    """Create database indexes for performance"""
    # Users
    await db.users.create_index("email", unique=True)
    await db.users.create_index("phone")

    # Farmers
    await db.farmers.create_index("card_number", unique=True)
    await db.farmers.create_index("phone")
    await db.farmers.create_index([("name", "text"), ("phone", "text")])

    # Milk entries
    await db.milk_entries.create_index([("farmer_id", 1), ("date", -1)])
    await db.milk_entries.create_index([("agent_id", 1), ("date", -1)])
    await db.milk_entries.create_index("date")

    # Debt
    await db.debts.create_index("farmer_id")

    # Inventory
    await db.inventory.create_index("name")

    logger.info("Database indexes created")
