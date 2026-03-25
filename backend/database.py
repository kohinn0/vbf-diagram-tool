from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, Text, JSON, DateTime, text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from datetime import datetime
from typing import Optional
import os

os.makedirs("data", exist_ok=True)

# 🌐 Database configuration
# Set DATABASE_URL env var for PostgreSQL: postgresql://user:password@localhost:5432/dbname
# TESTING=1 (pytest) → in-memory SQLite. Otherwise fall back to a local SQLite file.
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL")
if os.environ.get("TESTING") == "1" and not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

if not SQLALCHEMY_DATABASE_URL:
    os.makedirs("data", exist_ok=True)
    _db_path = os.environ.get("DATABASE_PATH", "./data/vbf_database.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{_db_path}"

# Create engine with appropriate arguments for the DB dialect
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    
    # SQLite optimization: WAL mode for better concurrency
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()
else:
    # PostgreSQL configuration
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Csomag alapértelmezett limitek (ha nincs subscription_plans rekord)
PLAN_DEFAULTS = {
    "FREE": {"reports_per_month": 5, "max_users": 2},
    "PRO": {"reports_per_month": 50, "max_users": 10},
    "ENTERPRISE": {"reports_per_month": None, "max_users": None},
}


class SubscriptionPlan(Base):
    """Admin által szerkeszthető csomag: ár, limitek, tartalom (hozzáférések)."""
    __tablename__ = "subscription_plans"
    plan_key = Column(String(32), primary_key=True)  # FREE, PRO, ENTERPRISE
    display_name = Column(String(128), nullable=False)
    price_monthly = Column(Integer, nullable=True)   # HUF, null = ingyenes / egyedi
    price_yearly = Column(Integer, nullable=True)    # HUF
    reports_per_month_limit = Column(Integer, nullable=True)  # null = korlátlan
    max_users = Column(Integer, nullable=True)
    features = Column(JSON, nullable=True)           # ["PDF export", "Email küldés", ...]
    sort_order = Column(Integer, default=0)


class Company(Base):
    """Cég: SUPER_ADMIN látja mindet, COMPANY_ADMIN csak a saját cégét. SaaS: plan + limitek."""
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    plan = Column(String, default="FREE", nullable=False)  # FREE | PRO | ENTERPRISE
    reports_per_month_limit = Column(Integer, nullable=True)  # null = korlátlan
    max_users = Column(Integer, nullable=True)  # null = korlátlan
    users = relationship("User", back_populates="company")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="TECH")  # SUPER_ADMIN | ADMIN | COMPANY_ADMIN | TECH
    email = Column(String, nullable=True)  # For SMTP job notifications
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    company = relationship("Company", back_populates="users")
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
    company_shared = Column(Boolean, default=True) # Share internally with company users
    notes = Column(Text, nullable=True) # Belső megjegyzés (szabad szöveg)
    inspector_notes = Column(Text, nullable=True) # Felülvizsgálói megjegyzés (Word-be kerül)
    
    # Store JSON strings for complex nested data structures from the frontend
    # For SQLite, SQLAlchemy JSON column type will handle serialization
    client_data = Column(JSON, nullable=True)
    diagram_data = Column(JSON, nullable=True) # the fabric.js canvas JSON
    diagram_image = Column(Text, nullable=True) # base64 PNG rendered diagram for docx export
    floor_plan_image = Column(Text, nullable=True) # base64 alaprajz kép
    defects_data = Column(JSON, nullable=True) # array of defects
    measurements_data = Column(JSON, nullable=True)
    incoming_phases = Column(JSON, nullable=True) # bejövő hálózati paraméterek (L1/L2/L3, típus, főbiz.)
    note_photos = Column(JSON, nullable=True) # felülvizsgálói megjegyzés csatolt képek (base64 list)
    
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
    logo_path = Column(String, nullable=True)  # relative path to logo
    signature_path = Column(String, nullable=True)  # aláírás kép (díszítés DOCX-ben)
    pfx_path = Column(String, nullable=True)  # hitelesítő tanúsítvány .pfx/.p12 (PDF aláíráshoz)
    owner_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)  # legacy: super admin saját
    company_id = Column(Integer, ForeignKey("companies.id"), unique=True, nullable=True)  # céghez kötött
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

class SiteNode(Base):
    __tablename__ = "site_nodes"
    id = Column(String, primary_key=True) # Using string ID for frontend compatibility (st_...)
    report_id = Column(Integer, ForeignKey("reports.id"), index=True)
    parent_id = Column(String, ForeignKey("site_nodes.id"), nullable=True)
    type = Column(String) # building, floor, panel, circuit
    name = Column(String)
    device = Column(String, nullable=True) # for panels
    collapsed = Column(Boolean, default=False)

    # ORM relationships
    report = relationship("Report", backref="nodes")
    # Self-referential parent/children kapcsolat helyesen definiálva
    parent = relationship("SiteNode", remote_side=[id], backref="children")

class RpeMeasurement(Base):
    __tablename__ = "meas_rpe"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("site_nodes.id"))
    point = Column(String, nullable=True)
    location = Column(String, nullable=True)
    val = Column(String, nullable=True)
    pass_status = Column(String, default="Igen")

class LoopMeasurement(Base):
    __tablename__ = "meas_loop"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("site_nodes.id"))
    circuit = Column(String, nullable=True)
    device = Column(String, nullable=True)
    location = Column(String, nullable=True)
    zs = Column(String, nullable=True)
    pass_status = Column(String, default="Igen")

class RcdMeasurement(Base):
    __tablename__ = "meas_rcd"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("site_nodes.id"))
    circuit = Column(String, nullable=True)
    type = Column(String, default="A")
    idn = Column(String, nullable=True)
    test_05 = Column(String, nullable=True)
    t1 = Column(String, nullable=True)
    t5 = Column(String, nullable=True)
    ramp = Column(String, nullable=True)
    uc = Column(String, nullable=True)
    pass_status = Column(String, default="Igen")

class InsulationMeasurement(Base):
    __tablename__ = "meas_insulation"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("site_nodes.id"))
    circuit = Column(String, nullable=True)
    ln = Column(String, nullable=True)
    lpe = Column(String, nullable=True)
    npe = Column(String, nullable=True)
    pass_status = Column(String, default="Igen")


class AuditLog(Base):
    """Audit napló: bejelentkezés, sikertelen kísérlet, regisztráció, fontos műveletek."""
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, index=True)  # login_ok, login_fail, register, delete_account, report_create, ...
    detail = Column(String, nullable=True)
    ip = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PendingOrder(Base):
    """Utalásos megrendelés: számla készül, hozzáférés csak jóváhagyás után."""
    __tablename__ = "pending_orders"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    customer_name = Column(String, nullable=False)
    plan_type = Column(String, nullable=False)  # monthly | yearly
    amount_huf = Column(Integer, nullable=False)
    status = Column(String, default="PENDING", nullable=False)  # PENDING | PAID | REJECTED
    buyer_zip = Column(String, nullable=True)
    buyer_city = Column(String, nullable=True)
    buyer_address = Column(String, nullable=True)
    buyer_tax_number = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)  # szamlazz.hu válaszból
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)  # PAID után
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    reminder_sent_at = Column(DateTime, nullable=True)  # határidő emlékeztető elküldve


class ReportShareToken(Base):
    """Jegyzőkönyv megosztás: read-only link token alapján."""
    __tablename__ = "report_share_tokens"
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=True)  # None = lejárhatatlan
    created_at = Column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    """Jelszó-visszaállító link: token hash, user_id, lejárat."""
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(64), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PendingCheckoutPassword(Base):
    """Vásárláskor megadott jelszó: Stripe session_id → hash; webhook felhasználja, majd törli."""
    __tablename__ = "pending_checkout_passwords"
    id = Column(Integer, primary_key=True, index=True)
    stripe_session_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PaymentLog(Base):
    """Vásárlási előzmények: Stripe és utalás egy helyen (admin lista, refund)."""
    __tablename__ = "payment_logs"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    customer_name = Column(String, nullable=True)
    plan_type = Column(String, nullable=False)  # monthly | yearly
    amount_huf = Column(Integer, nullable=False)
    payment_method = Column(String, nullable=False)  # stripe | bank_transfer
    stripe_session_id = Column(String, nullable=True)  # refundhoz
    pending_order_id = Column(Integer, ForeignKey("pending_orders.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    status = Column(String, default="completed", nullable=False)  # completed | refunded
    created_at = Column(DateTime, default=datetime.utcnow)
    refunded_at = Column(DateTime, nullable=True)


class DijbekeroSequence(Base):
    """Díjbekérő sorszám: év -> következő seq (pl. 2026 -> 3)."""
    __tablename__ = "dijbekero_sequences"
    year = Column(Integer, primary_key=True)
    last_seq = Column(Integer, default=0, nullable=False)


class DijbekeroPreset(Base):
    """Díjbekérő sablon: gyors kitöltés (pl. VBF Premium Pro)."""
    __tablename__ = "dijbekero_presets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    amount_huf = Column(Integer, nullable=True)
    description = Column(String(256), nullable=True)
    sort_order = Column(Integer, default=0)


class RegistrationInvite(Base):
    """Főadmin által küldött demó regisztrációs meghívó: e-mail + token hash, egyszer használatos."""
    __tablename__ = "registration_invites"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)


class MarketingSubscriber(Base):
    """Hírlevél / marketing értesítés: önkéntes feliratkozás (landing, regisztráció)."""
    __tablename__ = "marketing_subscribers"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=True)
    source = Column(String(64), nullable=True)  # landing | register | ...
    ip = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    unsubscribed_at = Column(DateTime, nullable=True)


def record_marketing_subscriber(
    db: Session,
    email: str,
    *,
    name: Optional[str] = None,
    source: str = "unknown",
    ip: Optional[str] = None,
) -> None:
    email_norm = (email or "").strip().lower()[:255]
    if not email_norm or "@" not in email_norm:
        return
    row = db.query(MarketingSubscriber).filter(MarketingSubscriber.email == email_norm).first()
    nm = (name or "").strip()[:200] or None
    src = (source or "unknown").strip()[:64] or "unknown"
    ip_s = (ip or "").strip()[:64] or None
    if row:
        row.unsubscribed_at = None
        if nm:
            row.name = nm
        row.source = src
        if ip_s:
            row.ip = ip_s
    else:
        db.add(
            MarketingSubscriber(
                email=email_norm,
                name=nm,
                source=src,
                ip=ip_s,
            )
        )
    db.commit()


def marketing_unsubscribe_email(db: Session, email: str) -> None:
    email_norm = (email or "").strip().lower()[:255]
    if not email_norm:
        return
    row = db.query(MarketingSubscriber).filter(MarketingSubscriber.email == email_norm).first()
    if row and not row.unsubscribed_at:
        row.unsubscribed_at = datetime.utcnow()
        db.commit()


Base.metadata.create_all(bind=engine)

# Migráció: company_settings.company_id (ha még nincs)
if SQLALCHEMY_DATABASE_URL and "sqlite" in SQLALCHEMY_DATABASE_URL:
    with engine.connect() as conn:
        try:
            r = conn.execute(text("PRAGMA table_info(company_settings)"))
            cols = [row[1] for row in r.fetchall()]
            if "company_id" not in cols:
                conn.execute(text("ALTER TABLE company_settings ADD COLUMN company_id INTEGER"))
                conn.commit()
            r2 = conn.execute(text("PRAGMA table_info(company_settings)"))
            cols2 = [row[1] for row in r2.fetchall()]
            if "signature_path" not in cols2:
                conn.execute(text("ALTER TABLE company_settings ADD COLUMN signature_path VARCHAR"))
                conn.commit()
            r3 = conn.execute(text("PRAGMA table_info(company_settings)"))
            cols3 = [row[1] for row in r3.fetchall()]
            if "pfx_path" not in cols3:
                conn.execute(text("ALTER TABLE company_settings ADD COLUMN pfx_path VARCHAR"))
                conn.commit()
            # SaaS: companies plan + limits
            r4 = conn.execute(text("PRAGMA table_info(companies)"))
            cols4 = [row[1] for row in r4.fetchall()]
            if "plan" not in cols4:
                conn.execute(text("ALTER TABLE companies ADD COLUMN plan VARCHAR DEFAULT 'FREE'"))
                conn.commit()
            if "reports_per_month_limit" not in cols4:
                conn.execute(text("ALTER TABLE companies ADD COLUMN reports_per_month_limit INTEGER"))
                conn.commit()
            if "max_users" not in cols4:
                conn.execute(text("ALTER TABLE companies ADD COLUMN max_users INTEGER"))
                conn.commit()
            # payment_logs tábla (ha még nincs)
            try:
                r5 = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='payment_logs'"))
                if r5.fetchone() is None:
                    conn.execute(text("""
                        CREATE TABLE payment_logs (
                            id INTEGER NOT NULL PRIMARY KEY,
                            email VARCHAR NOT NULL,
                            customer_name VARCHAR,
                            plan_type VARCHAR NOT NULL,
                            amount_huf INTEGER NOT NULL,
                            payment_method VARCHAR NOT NULL,
                            stripe_session_id VARCHAR,
                            pending_order_id INTEGER,
                            company_id INTEGER,
                            status VARCHAR NOT NULL DEFAULT 'completed',
                            created_at DATETIME,
                            refunded_at DATETIME,
                            FOREIGN KEY(pending_order_id) REFERENCES pending_orders(id),
                            FOREIGN KEY(company_id) REFERENCES companies(id)
                        )
                    """))
                    conn.commit()
            except Exception:
                pass
            # pending_orders.reminder_sent_at (határidő emlékeztető)
            r_po = conn.execute(text("PRAGMA table_info(pending_orders)"))
            cols_po = [row[1] for row in r_po.fetchall()]
            if "reminder_sent_at" not in cols_po:
                conn.execute(text("ALTER TABLE pending_orders ADD COLUMN reminder_sent_at DATETIME"))
                conn.commit()
            # password_reset_tokens tábla (elfelejtett jelszó)
            try:
                r6 = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens'"))
                if r6.fetchone() is None:
                    conn.execute(text("""
                        CREATE TABLE password_reset_tokens (
                            id INTEGER NOT NULL PRIMARY KEY,
                            user_id INTEGER NOT NULL,
                            token_hash VARCHAR(64) NOT NULL,
                            expires_at DATETIME NOT NULL,
                            created_at DATETIME,
                            FOREIGN KEY(user_id) REFERENCES users(id)
                        )
                    """))
                    conn.execute(text("CREATE INDEX ix_password_reset_tokens_token_hash ON password_reset_tokens (token_hash)"))
                    conn.commit()
            except Exception:
                pass
            # registration_invites (főadmin meghívók)
            try:
                r_inv = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='registration_invites'"))
                if r_inv.fetchone() is None:
                    conn.execute(text("""
                        CREATE TABLE registration_invites (
                            id INTEGER NOT NULL PRIMARY KEY,
                            email VARCHAR(255) NOT NULL,
                            token_hash VARCHAR(64) NOT NULL,
                            expires_at DATETIME NOT NULL,
                            created_at DATETIME,
                            created_by_id INTEGER,
                            used_at DATETIME,
                            FOREIGN KEY(created_by_id) REFERENCES users(id)
                        )
                    """))
                    conn.execute(text(
                        "CREATE INDEX ix_registration_invites_email ON registration_invites (email)"
                    ))
                    conn.execute(text(
                        "CREATE INDEX ix_registration_invites_token_hash ON registration_invites (token_hash)"
                    ))
                    conn.commit()
            except Exception:
                pass
        except Exception:
            pass
        # Új mezők: inspector_notes, floor_plan_image, incoming_phases, note_photos
        try:
            r_rep = conn.execute(text("PRAGMA table_info(reports)"))
            cols_rep = [row[1] for row in r_rep.fetchall()]
            for col_def in [
                ("inspector_notes", "TEXT"),
                ("floor_plan_image", "TEXT"),
            ]:
                col_name, col_type = col_def
                if col_name not in cols_rep:
                    conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
            for col_name in ["incoming_phases", "note_photos"]:
                if col_name not in cols_rep:
                    conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_name} JSON"))
                    conn.commit()
        except Exception:
            pass

# subscription_plans tábla: create_all létrehozza; seed ha üres
def _seed_subscription_plans():
    try:
        db = SessionLocal()
        if db.query(SubscriptionPlan).count() == 0:
            for i, (key, defaults) in enumerate([
                ("FREE", {"display_name": "Ingyenes", "reports": 5, "users": 2, "features": ["5 jegyzőkönyv/hó", "2 felhasználó", "Word export", "PDF vízjellel (demó)"]}),
                ("PRO", {"display_name": "Pro", "reports": 50, "users": 10, "features": ["50 jegyzőkönyv/hó", "10 felhasználó", "PDF aláírás", "Email küldés"]}),
                ("ENTERPRISE", {"display_name": "Céges", "reports": None, "users": None, "features": ["Korlátlan jegyzőkönyv", "Korlátlan felhasználó", "Minden funkció"]}),
            ]):
                d = defaults
                plan = SubscriptionPlan(
                    plan_key=key,
                    display_name=d["display_name"],
                    price_monthly=0 if key == "FREE" else None,
                    price_yearly=None,
                    reports_per_month_limit=d.get("reports"),
                    max_users=d.get("users"),
                    features=d.get("features", []),
                    sort_order=i,
                )
                db.add(plan)
            db.commit()
        db.close()
    except Exception:
        pass

_seed_subscription_plans()


def get_effective_plan_limits(db, company):
    """Cég effektív limitei: company override, vagy subscription_plans sor, vagy PLAN_DEFAULTS. (reports_per_month, max_users)."""
    if not company:
        return None, None
    reports = getattr(company, "reports_per_month_limit", None)
    users = getattr(company, "max_users", None)
    if reports is not None and users is not None:
        return reports, users
    plan_row = db.query(SubscriptionPlan).filter(SubscriptionPlan.plan_key == (company.plan or "FREE")).first()
    if plan_row:
        if reports is None:
            reports = plan_row.reports_per_month_limit
        if users is None:
            users = plan_row.max_users
    if reports is None or users is None:
        defaults = PLAN_DEFAULTS.get(company.plan or "FREE", {})
        if reports is None:
            reports = defaults.get("reports_per_month")
        if users is None:
            users = defaults.get("max_users")
    return reports, users


def pdf_export_requires_watermark(db: Session, report_owner: Optional[User]) -> bool:
    """
    True = PDF vízjellel, digitális aláírás nélkül (ingyenes / demó cég, vagy lejárt PRO).
    """
    if not report_owner:
        return True
    if report_owner.role in ("SUPER_ADMIN", "ADMIN"):
        return False
    db.refresh(report_owner, ["company"])
    company = report_owner.company
    if not company:
        return True
    plan = (company.plan or "FREE").upper()
    if plan == "FREE":
        return True
    if plan == "ENTERPRISE":
        return False
    if plan == "PRO":
        exp = getattr(report_owner, "subscription_expires", None)
        if exp and exp < datetime.utcnow():
            return True
        return False
    return True


def user_pdf_export_watermarked(db: Session, user: User) -> bool:
    return pdf_export_requires_watermark(db, user)
