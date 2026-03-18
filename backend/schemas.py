from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


# --- Enums ---

class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    COMPANY_ADMIN = "COMPANY_ADMIN"
    TECH = "TECH"


class SubscriptionPlan(str, Enum):
    FREE = "FREE"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"


class ReportStatus(str, Enum):
    DRAFT = "DRAFT"
    FINAL = "FINAL"


class DefectSeverity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

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
    role: UserRole
    company_id: Optional[int] = None
    company_name: Optional[str] = None  # kitöltve a backendben joinnal
    subscription_expires: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """
    Admin által módosítható adatok felhasználón: erősen limitált mezők.
    Kritikus mezők (szerepkör, aktiválás, előfizetés) külön admin folyamatokon keresztül kezelendők.
    """
    email: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    """Jelszó módosítás: régi + új (bejelentkezett user)."""
    current_password: str
    new_password: str


class ProfileUpdateRequest(BaseModel):
    """Saját profil: csak email módosítható (bejelentkezett user)."""
    email: Optional[str] = None


class RequestPasswordResetRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# --- Report & Measurement Schemas (embedded JSON) ---


class Defect(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    severity: Optional[DefectSeverity] = None
    photo: Optional[str] = None


class RpeMeasurementData(BaseModel):
    node_id: Optional[str] = None
    point: Optional[str] = None
    location: Optional[str] = None
    val: Optional[str] = None
    pass_status: str = "Igen"
    photo: Optional[str] = None


class LoopMeasurementData(BaseModel):
    node_id: Optional[str] = None
    circuit: Optional[str] = None
    device: Optional[str] = None
    location: Optional[str] = None
    zs: Optional[str] = None
    pass_status: str = "Igen"
    photo: Optional[str] = None


class RcdMeasurementData(BaseModel):
    node_id: Optional[str] = None
    circuit: Optional[str] = None
    type: str = "A"
    idn: Optional[str] = None
    test_05: Optional[str] = None
    t1: Optional[str] = None
    t5: Optional[str] = None
    ramp: Optional[str] = None
    uc: Optional[str] = None
    pass_status: str = "Igen"
    photo: Optional[str] = None


class InsulationMeasurementData(BaseModel):
    node_id: Optional[str] = None
    circuit: Optional[str] = None
    ln: Optional[str] = None
    lpe: Optional[str] = None
    npe: Optional[str] = None
    pass_status: str = "Igen"
    photo: Optional[str] = None


class ToolMeasurementData(BaseModel):
    node_id: Optional[str] = None
    name: Optional[str] = None
    serial: Optional[str] = None
    next_calibration: Optional[str] = None
    pass_status: str = "Igen"
    photo: Optional[str] = None


class SelvMeasurementData(BaseModel):
    node_id: Optional[str] = None
    circuit: Optional[str] = None
    description: Optional[str] = None
    pass_status: str = "Igen"
    photo: Optional[str] = None


class EhpContMeasurementData(BaseModel):
    node_id: Optional[str] = None
    point: Optional[str] = None
    location: Optional[str] = None
    val: Optional[str] = None
    pass_status: str = "Igen"
    photo: Optional[str] = None


class MeasurementsBlock(BaseModel):
    rpe: Optional[List[RpeMeasurementData]] = None
    insulation: Optional[List[InsulationMeasurementData]] = None
    loop: Optional[List[LoopMeasurementData]] = None
    rcd: Optional[List[RcdMeasurementData]] = None
    tools: Optional[List[ToolMeasurementData]] = None
    selv: Optional[List[SelvMeasurementData]] = None
    eph_cont: Optional[List[EhpContMeasurementData]] = None


# --- Report Schemas ---
class ReportBase(BaseModel):
    title: str
    report_type: str
    client_data: Optional[Dict[str, Any]] = None
    diagram_data: Optional[Dict[str, Any]] = None
    diagram_image: Optional[str] = None
    defects_data: Optional[List[Defect]] = None
    measurements_data: Optional[MeasurementsBlock] = None

class ReportCreate(ReportBase):
    pass

class ReportUpdate(ReportBase):
    pass

class ReportResponse(ReportBase):
    id: int
    status: ReportStatus
    owner_id: int
    created_at: datetime
    updated_at: datetime
    finalized_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportExportZipRequest(BaseModel):
    report_ids: List[int]


class ReportImportRequest(BaseModel):
    title: str
    report_type: str
    client_data: Optional[Dict[str, Any]] = None
    diagram_data: Optional[Dict[str, Any]] = None
    diagram_image: Optional[str] = None
    defects_data: Optional[List[Dict[str, Any]]] = None
    measurements_data: Optional[MeasurementsBlock] = None  # strukturált formátum (rpe, loop, stb.)


class ReportShareResponse(BaseModel):
    share_url: str
    token: str
    expires_at: Optional[datetime] = None


class MeasurementTemplateCreate(BaseModel):
    name: str
    template_json: Dict[str, Any]  # { rpe: [], loop: [], insulation: [], rcd: [] }

class MeasurementTemplateUpdate(BaseModel):
    name: Optional[str] = None
    template_json: Optional[Dict[str, Any]] = None

class MeasurementTemplateResponse(BaseModel):
    id: int
    company_id: Optional[int] = None
    owner_id: Optional[int] = None
    name: str
    template_json: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class ReportAuditLogEntry(BaseModel):
    """Egy audit bejegyzés (5.2)."""
    id: int
    report_id: int
    user_id: Optional[int] = None
    action: str
    meta: Optional[Dict[str, Any]] = None
    created_at: datetime
    username: Optional[str] = None

    class Config:
        from_attributes = True


# --- Company (cégenkénti szűrés) ---
class CompanyBase(BaseModel):
    name: str


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    """Super admin: csomag és limitek frissítése."""
    name: Optional[str] = None
    plan: Optional[SubscriptionPlan] = None
    reports_per_month_limit: Optional[int] = None
    max_users: Optional[int] = None


class CompanyResponse(CompanyBase):
    id: int
    plan: Optional[SubscriptionPlan] = SubscriptionPlan.FREE
    reports_per_month_limit: Optional[int] = None
    max_users: Optional[int] = None

    class Config:
        from_attributes = True


class UsageResponse(BaseModel):
    """SaaS: havi report és user limit kihasználtság (cégenként)."""
    reports_this_month: int = 0
    reports_limit: Optional[int] = None  # None = korlátlan
    users_count: int = 0
    users_limit: Optional[int] = None
    plan: SubscriptionPlan = SubscriptionPlan.FREE


# --- Előfizetési csomagok (admin szerkesztheti: ár, tartalom) ---
class SubscriptionPlanResponse(BaseModel):
    plan_key: SubscriptionPlan
    display_name: str
    price_monthly: Optional[int] = None   # HUF
    price_yearly: Optional[int] = None
    reports_per_month_limit: Optional[int] = None
    max_users: Optional[int] = None
    features: Optional[List[str]] = None
    sort_order: int = 0

    class Config:
        from_attributes = True


class SubscriptionPlanUpdate(BaseModel):
    display_name: Optional[str] = None
    price_monthly: Optional[int] = None
    price_yearly: Optional[int] = None
    reports_per_month_limit: Optional[int] = None
    max_users: Optional[int] = None
    features: Optional[List[str]] = None
    sort_order: Optional[int] = None


# --- Utalásos megrendelés (nincs token vissza, csak üzenet) ---
class BankTransferRequest(BaseModel):
    email: str
    customer_name: str
    class PlanType(str, Enum):
        MONTHLY = "monthly"
        YEARLY = "yearly"

    plan_type: PlanType = PlanType.YEARLY
    buyer_address: str  # Kötelező számlázási cím
    buyer_zip: Optional[str] = None
    buyer_city: Optional[str] = None
    buyer_tax_number: Optional[str] = None


class BankTransferResponse(BaseModel):
    message: str  # Csak üzenet, semmilyen token vagy hozzáférés adat


class PendingOrderResponse(BaseModel):
    id: int
    email: str
    customer_name: str
    plan_type: str
    amount_huf: int
    status: str
    invoice_number: Optional[str] = None
    company_id: Optional[int] = None
    created_at: datetime
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentLogResponse(BaseModel):
    id: int
    email: str
    customer_name: Optional[str] = None
    plan_type: str
    amount_huf: int
    payment_method: str
    stripe_session_id: Optional[str] = None
    pending_order_id: Optional[int] = None
    company_id: Optional[int] = None
    status: str
    created_at: datetime
    refunded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Company Settings Schemas ---
class CompanySettingsBase(BaseModel):
    company_name: Optional[str] = None
    tax_number: Optional[str] = None
    address: Optional[str] = None
    bank_account: Optional[str] = None
    logo_path: Optional[str] = None
    signature_path: Optional[str] = None
    pfx_path: Optional[str] = None
    docx_header_text: Optional[str] = None
    docx_footer_text: Optional[str] = None
    docx_primary_color: Optional[str] = None
    docx_embed_diagram: Optional[bool] = True  # rajz beágyazása a DOCX-be (False = csak Rajz PDF)

class CompanySettingsCreate(CompanySettingsBase):
    pass

class CompanySettingsUpdate(CompanySettingsBase):
    pass

class CompanySettingsResponse(CompanySettingsBase):
    id: int
    owner_id: Optional[int] = None
    company_id: Optional[int] = None

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

# --- Site Tree & Measurement Schemas (Relational) ---
class SiteNodeSchema(BaseModel):
    id: str
    type: str  # building, floor, panel, circuit
    name: str
    device: Optional[str] = None
    collapsed: bool = False
    parent_id: Optional[str] = None

    class Config:
        from_attributes = True

class RpeMeasurementSchema(BaseModel):
    node_id: str
    point: Optional[str] = None
    location: Optional[str] = None
    val: Optional[str] = None
    pass_status: str = "Igen"

class LoopMeasurementSchema(BaseModel):
    node_id: str
    circuit: Optional[str] = None
    device: Optional[str] = None
    location: Optional[str] = None
    zs: Optional[str] = None
    pass_status: str = "Igen"

class RcdMeasurementSchema(BaseModel):
    node_id: str
    circuit: Optional[str] = None
    type: str = "A"
    idn: Optional[str] = None
    test_05: Optional[str] = None
    t1: Optional[str] = None
    t5: Optional[str] = None
    ramp: Optional[str] = None
    uc: Optional[str] = None
    pass_status: str = "Igen"

class InsulationMeasurementSchema(BaseModel):
    node_id: str
    circuit: Optional[str] = None
    ln: Optional[str] = None
    lpe: Optional[str] = None
    npe: Optional[str] = None
    pass_status: str = "Igen"
