from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Store users.db inside data folder
os.makedirs("data", exist_ok=True)
DATABASE_URL = "sqlite:///./data/users.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── User Table ──
class UserModel(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)


# ── Create all tables on startup ──
def init_db():
    Base.metadata.create_all(bind=engine)


# ── Dependency: get DB session ──
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()