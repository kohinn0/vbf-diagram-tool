from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    role: str
    company_id: Optional[int] = None
    subscription_expires: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    email: Optional[str] = None
    company_id: Optional[int] = None
    subscription_expires: Optional[datetime] = None

# --- Report Schemas ---
class ReportBase(BaseModel):
    title: str
    report_type: str
    client_data: Optional[Dict[str, Any]] = None
    diagram_data: Optional[Dict[str, Any]] = None
    defects_data: Optional[List[Dict[str, Any]]] = None
    measurements_data: Optional[List[Dict[str, Any]]] = None

class ReportCreate(ReportBase):
    pass

class ReportUpdate(ReportBase):
    pass

class ReportResponse(ReportBase):
    id: int
    status: str
    owner_id: int
    created_at: datetime
    updated_at: datetime
    finalized_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Master Data Schemas ---
class CustomerBase(BaseModel):
    name: str
    address: Optional[str] = None
    hrsz: Optional[str] = None
    building_purpose: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    owner_id: int
    class Config:
        from_attributes = True

class InspectorBase(BaseModel):
    name: str
    license: Optional[str] = None
    instrument_type: Optional[str] = None
    instrument_cal: Optional[str] = None

class InspectorCreate(InspectorBase):
    pass

class InspectorResponse(InspectorBase):
    id: int
    owner_id: int
    class Config:
        from_attributes = True

# --- CRM / Job Schemas ---
class JobBase(BaseModel):
    title: str
    address: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    status: Optional[str] = "PENDING"
    assigned_to_id: Optional[int] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None

class JobResponse(JobBase):
    id: int
    created_by_id: int
    
    class Config:
        from_attributes = True

# --- Email Schema ---
class EmailRequest(BaseModel):
    to_email: str
    subject: Optional[str] = "Jegyzőkönyv"
    body: Optional[str] = "Tisztelt Ügyfelünk!\n\nMellékelve küldjük az elkészült érintésvédelmi jegyzőkönyvet.\n\nÜdvözlettel,\nA VizsgálóCsapat"
