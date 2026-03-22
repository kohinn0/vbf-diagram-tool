from pydantic import BaseModel, Field
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
    company_name: Optional[str] = None  # demó regisztráció: új cég megjelenített neve
    marketing_opt_in: bool = Field(default=False, description="Hírlevél / marketing (GDPR hozzájárulás)")
    invite_token: Optional[str] = Field(default=None, description="Főadmin meghívó link tokenje (opcionális)")


class RegistrationInviteCreate(BaseModel):
    email: str


class RegistrationInviteResponse(BaseModel):
    id: int
    email: str
    created_at: datetime
    expires_at: datetime
    used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RegistrationInviteCreatedResponse(BaseModel):
    invite: RegistrationInviteResponse
    email_sent: bool
    register_url: str
    detail: Optional[str] = None


class MarketingSubscribeRequest(BaseModel):
    email: str
    name: Optional[str] = None
    consent: bool = False
    source: Optional[str] = "landing"


class MarketingUnsubscribeRequest(BaseModel):
    email: str


class MarketingSubscriberAdminResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    source: Optional[str] = None
    ip: Optional[str] = None
    created_at: datetime
    unsubscribed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserResponse(UserBase):
    id: int
    is_active: bool
    role: str
    company_id: Optional[int] = None
    company_name: Optional[str] = None  # kitöltve a backendben joinnal
    subscription_expires: Optional[datetime] = None
    company_plan: Optional[str] = None  # FREE | PRO | ENTERPRISE
    pdf_export_watermarked: bool = True  # True: PDF demó/ingyenes – vízjeles, nincs teljes értékű aláírás

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    email: Optional[str] = None
    company_id: Optional[int] = None
    subscription_expires: Optional[datetime] = None


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

# --- Report Schemas ---
class ReportBase(BaseModel):
    title: str
    report_type: str
    client_data: Optional[Dict[str, Any]] = None
    diagram_data: Optional[Dict[str, Any]] = None
    diagram_image: Optional[str] = None
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


class ReportExportZipRequest(BaseModel):
    report_ids: List[int]


class ReportImportRequest(BaseModel):
    title: str
    report_type: str
    client_data: Optional[Dict[str, Any]] = None
    diagram_data: Optional[Dict[str, Any]] = None
    diagram_image: Optional[str] = None
    defects_data: Optional[List[Dict[str, Any]]] = None
    measurements_data: Optional[Dict[str, Any]] = None  # dict formátum (rpe, loop, stb.)


class ReportShareResponse(BaseModel):
    share_url: str
    token: str
    expires_at: Optional[datetime] = None

# --- Company (cégenkénti szűrés) ---
class CompanyBase(BaseModel):
    name: str


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    """Super admin: csomag és limitek frissítése."""
    name: Optional[str] = None
    plan: Optional[str] = None
    reports_per_month_limit: Optional[int] = None
    max_users: Optional[int] = None


class CompanyResponse(CompanyBase):
    id: int
    plan: Optional[str] = "FREE"
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
    plan: str = "FREE"


# --- Előfizetési csomagok (admin szerkesztheti: ár, tartalom) ---
class SubscriptionPlanResponse(BaseModel):
    plan_key: str
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
    plan_type: str = "yearly"  # monthly | yearly
    buyer_address: str  # Kötelező számlázási cím
    buyer_zip: Optional[str] = None
    buyer_city: Optional[str] = None
    buyer_tax_number: Optional[str] = None


class BankTransferResponse(BaseModel):
    message: str  # Csak üzenet, semmilyen token vagy hozzáférés adat


class DijbekeroRequest(BaseModel):
    """Díjbekérő PDF: opcionális mezők. Ha send_to_email megadva, SMTP-val kiküldi sablon e-mailben."""
    amount_huf: Optional[int] = None
    description: Optional[str] = None
    due_date: Optional[str] = None  # pl. 2026.04.15
    vevo_nev: Optional[str] = None
    vevo_cim: Optional[str] = None
    send_to_email: Optional[str] = None  # ha megadva: PDF e-mailben kiküldve a címzettnek


class DijbekeroPresetCreate(BaseModel):
    name: str
    amount_huf: Optional[int] = None
    description: Optional[str] = None


class DijbekeroPresetResponse(BaseModel):
    id: int
    name: str
    amount_huf: Optional[int] = None
    description: Optional[str] = None
    sort_order: int = 0

    class Config:
        from_attributes = True


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
