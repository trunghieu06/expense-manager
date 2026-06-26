from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
from datetime import datetime, timezone

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="VND", nullable=False)
    category = Column(String, index=True, nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
