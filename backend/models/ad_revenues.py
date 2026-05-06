from sqlalchemy import Column, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.sql import func

from backend.models.base import Base
from backend.schemas.ad_revenues.enums import AdRevenueType


class AdRevenue(Base):
    __tablename__ = "ad_revenues"
    __table_args__ = (
        Index("ix_ad_revenues_owner_date", "owner_id", "revenue_date"),
        Index("ix_ad_revenues_owner_type_date", "owner_id", "type", "revenue_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    type = Column(String(16), nullable=False)
    buyer = Column(String(255), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False, default=0)
    currency = Column(String(8), nullable=False, default="RUB")
    revenue_date = Column(Date, nullable=False)
    note = Column(Text, nullable=True)

    publication_id = Column(Integer, ForeignKey("publications.id", ondelete="SET NULL"), nullable=True, index=True)
    channel_id = Column(Integer, ForeignKey("channel_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
