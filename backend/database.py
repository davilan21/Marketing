from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./marketing.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    agent_name = Column(String(100), nullable=False)
    task = Column(String(255), nullable=False)
    input = Column(Text, nullable=True)
    output = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="pending")
    campaign_id = Column(String(100), nullable=True)


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_audience = Column(String(255), nullable=True)
    goals = Column(Text, nullable=True)
    status = Column(String(50), default="running")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


class ReviewRequest(Base):
    __tablename__ = "review_requests"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(String(100), nullable=False)
    agent_name = Column(String(100), nullable=False)
    task = Column(String(255), nullable=False)
    output = Column(Text, nullable=True)
    status = Column(String(50), default="pending_approval")  # pending_approval | approved | rejected
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    decided_at = Column(DateTime, nullable=True)


class ApprovalLog(Base):
    """Immutable audit trail of every approve/reject decision."""
    __tablename__ = "approval_logs"

    id = Column(Integer, primary_key=True, index=True)
    review_request_id = Column(Integer, nullable=False)
    campaign_id = Column(String(100), nullable=False)
    agent_name = Column(String(100), nullable=False)
    task = Column(String(255), nullable=False)
    decision = Column(String(20), nullable=False)   # "approved" | "rejected"
    decided_at = Column(DateTime, nullable=False)


class PlatformCredentials(Base):
    """Stores API credentials for each social media platform."""
    __tablename__ = "platform_credentials"

    id         = Column(Integer, primary_key=True, index=True)
    platform   = Column(String(50), unique=True, nullable=False)  # instagram | linkedin | tiktok
    creds_json = Column(Text, nullable=False, default="{}")       # JSON blob of credential fields
    enabled    = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
