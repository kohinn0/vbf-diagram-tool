from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os

os.makedirs("data", exist_ok=True)

# Support environment variable for Docker, fallback to local path
_db_path = os.environ.get("DATABASE_PATH", "./data/vbf_database.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{_db_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Enable WAL journal mode for better concurrency (critical in Docker/containers)
from sqlalchemy import event

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")  # Wait up to 5s if DB is locked
    cursor.close()
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
    report_limit = Column(Integer, default=-1) # -1 for unlimited, else monthly limit
    
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
    diagram_image = Column(Text, nullable=True) # base64 PNG rendered diagram for docx export
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

class CompanySettings(Base):
    __tablename__ = "company_settings"
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=True)
    tax_number = Column(String, nullable=True)
    address = Column(String, nullable=True)
    bank_account = Column(String, nullable=True)
    logo_path = Column(String, nullable=True) # relative path to logo
    owner_id = Column(Integer, ForeignKey("users.id"), unique=True)
    owner = relationship("User", backref="company_settings")

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
