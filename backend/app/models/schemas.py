from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


# â”€â”€â”€ Enums â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class UserRole(str, Enum):
    ADMIN = "admin"
    AGENT = "agent"
    FARMER = "farmer"


class MilkType(str, Enum):
    COW = "cow"
    BUFFALO = "buffalo"


class InventoryCategory(str, Enum):
    FEED = "feed"
    MEDICINE = "medicine"
    EQUIPMENT = "equipment"
    OTHER = "other"


# â”€â”€â”€ User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    phone: Optional[str] = None
    role: UserRole = UserRole.FARMER
    is_active: bool = True
    language: str = "en"


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    language: Optional[str] = None


class UserInDB(UserBase):
    id: Optional[str] = Field(alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    farmer_id: Optional[str] = None
    agent_id: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class UserResponse(UserBase):
    id: str
    created_at: Optional[datetime] = None
    farmer_id: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


# â”€â”€â”€ Farmer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class BankDetails(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch: Optional[str] = None


class GPSLocation(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class FarmerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=6, max_length=15)
    address: Optional[str] = None
    card_number: str = Field(..., min_length=1, max_length=20)
    bank_details: Optional[BankDetails] = None
    gps_location: Optional[GPSLocation] = None
    milk_type: MilkType = MilkType.BUFFALO
    agent_id: Optional[str] = None
    is_active: bool = True


class FarmerCreate(FarmerBase):
    pass


class FarmerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bank_details: Optional[BankDetails] = None
    gps_location: Optional[GPSLocation] = None
    milk_type: Optional[MilkType] = None
    agent_id: Optional[str] = None
    is_active: Optional[bool] = None


class FarmerInDB(FarmerBase):
    id: Optional[str] = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class FarmerResponse(FarmerBase):
    id: str
    created_at: datetime


# â”€â”€â”€ Milk Entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class MilkEntryBase(BaseModel):
    farmer_id: str
    card_number: str
    litres: float = Field(..., gt=0, le=100)
    fat: float = Field(..., gt=0, le=10)
    milk_type: MilkType = MilkType.BUFFALO
    shift: str = "morning"  # morning/evening
    date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

    @validator("fat", pre=True)
    def parse_fat(cls, v):
        """Convert 62 â†’ 6.2, ensure max 10"""
        fat = float(v)
        if fat > 10:
            fat = fat / 10
        if fat > 10:
            raise ValueError("Fat cannot exceed 10%")
        return round(fat, 1)


class MilkEntryCreate(MilkEntryBase):
    agent_id: str


class MilkEntryInDB(MilkEntryBase):
    id: Optional[str] = Field(alias="_id")
    agent_id: str
    rate: float = 0
    amount: float = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    synced: bool = True

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class MilkEntryResponse(MilkEntryBase):
    id: str
    agent_id: str
    rate: float
    amount: float
    created_at: datetime


# â”€â”€â”€ Milk Price â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class MilkPriceBase(BaseModel):
    milk_type: MilkType
    price_per_fat_unit: float = Field(..., gt=0)
    effective_from: datetime = Field(default_factory=datetime.utcnow)
    set_by: Optional[str] = None
    notes: Optional[str] = None


class MilkPriceCreate(MilkPriceBase):
    pass


class MilkPriceInDB(MilkPriceBase):
    id: Optional[str] = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class MilkPriceResponse(MilkPriceBase):
    id: str
    created_at: datetime


# â”€â”€â”€ Debt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class DebtBase(BaseModel):
    farmer_id: str
    description: Optional[str] = None


class LoanCreate(BaseModel):
    farmer_id: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)


class RepaymentCreate(BaseModel):
    debt_id: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)


class DebtTransaction(BaseModel):
    type: str  # "loan" | "repayment"
    amount: float
    description: Optional[str] = None
    date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DebtInDB(BaseModel):
    id: Optional[str] = Field(alias="_id")
    farmer_id: str
    total_taken: float = 0
    total_paid: float = 0
    balance: float = 0
    transactions: List[DebtTransaction] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class DebtResponse(BaseModel):
    id: str
    farmer_id: str
    total_taken: float
    total_paid: float
    balance: float
    transactions: List[DebtTransaction]
    created_at: datetime


# â”€â”€â”€ Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class InventoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    category: InventoryCategory
    quantity: float = Field(..., ge=0)
    unit: str = "kg"
    low_stock_threshold: float = 10
    price_per_unit: Optional[float] = None
    description: Optional[str] = None
    supplier: Optional[str] = None


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    low_stock_threshold: Optional[float] = None
    price_per_unit: Optional[float] = None
    description: Optional[str] = None


class InventoryInDB(InventoryBase):
    id: Optional[str] = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class InventoryResponse(InventoryBase):
    id: str
    is_low_stock: bool = False
    created_at: datetime


# â”€â”€â”€ Common â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    limit: int
    pages: int


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: str
    password: str

