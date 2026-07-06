from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TransactionBase(BaseModel):
    amount: float
    currency: str = "VND"
    category: str
    note: Optional[str] = None

class TransactionCreate(TransactionBase):
    created_at: Optional[datetime] = None

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[datetime] = None

class TransactionResponse(TransactionBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True # Hỗ trợ SQLAlchemy model (hoặc from_attributes=True trong pydantic v2)
        from_attributes = True

class CategorySummary(BaseModel):
    category: str
    currency: str
    total_amount: float

class MonthlySummary(BaseModel):
    month: str
    currency: str
    total_amount: float

class BulkDeleteRequest(BaseModel):
    ids: list[int]

class SmartEntryRequest(BaseModel):
    text: str
