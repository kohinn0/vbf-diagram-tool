from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os

os.makedirs("data", exist_ok=True)
SQLALCHEMY_DATABASE_URL = "sqlite:///./data/vbf_database.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="TECH") # ADMIN or TECH
    email = Column(String, nullable=True) # For SMTP job notifications
    company_id = Column(Integer, nullable=True) # For group work
    subscription_expires = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True) # GDPR soft delete
    
    reports = relationship("Report", back_populates="owner")
    customers = relationship("Customer", back_populates="owner")
    inspectors = relationship("Inspector", back_populates="owner")
    assigned_jobs = relationship("Job", back_populates="assignee", foreign_keys='Job.assigned_to_id')
    created_jobs = relationship("Job", back_populates="creator", foreign_keys='Job.created_by_id')

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    report_type = Column(String, index=True) # vbf, vvf, eph
    status = Column(String, default="DRAFT") # DRAFT or FINAL
    
    # Store JSON strings for complex nested data structures from the frontend
    # For SQLite, SQLAlchemy JSON column type will handle serialization
    client_data = Column(JSON, nullable=True)
    diagram_data = Column(JSON, nullable=True) # the fabric.js canvas JSON
    defects_data = Column(JSON, nullable=True) # array of defects
    measurements_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    finalized_at = Column(DateTime, nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="reports")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String, nullable=True)
    hrsz = Column(String, nullable=True)
    building_purpose = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="customers")

class Inspector(Base):
    __tablename__ = "inspectors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    license = Column(String, nullable=True)
    instrument_type = Column(String, nullable=True)
    instrument_cal = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="inspectors")

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    address = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    scheduled_date = Column(DateTime, nullable=True)
    status = Column(String, default="PENDING") # PENDING, IN_PROGRESS, COMPLETED
    
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    created_by_id = Column(Integer, ForeignKey("users.id"))
    
    assignee = relationship("User", back_populates="assigned_jobs", foreign_keys=[assigned_to_id])
    creator = relationship("User", back_populates="created_jobs", foreign_keys=[created_by_id])

Base.metadata.create_all(bind=engine)
