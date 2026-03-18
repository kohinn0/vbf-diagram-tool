from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
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
    logo_path = Column(String, nullable=True)  # relative path to logo
    signature_path = Column(String, nullable=True)  # aláírás kép (díszítés DOCX-ben)
    pfx_path = Column(String, nullable=True)  # hitelesítő tanúsítvány .pfx/.p12 (PDF aláíráshoz)
    docx_header_text = Column(Text, nullable=True)   # egyéni fejléc szöveg (pl. "Cégnév | 1234 Bp.")
    docx_footer_text = Column(Text, nullable=True)  # egyéni lábléc szöveg (pl. "www.ceg.hu")
    docx_primary_color = Column(String(32), nullable=True)  # hex pl. #1e3a5f (címek, táblázat fejléc)
    docx_embed_diagram = Column(Boolean, default=True)  # True = rajz a DOCX-ben, False = csak Rajz PDF külön
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


class MeasurementTemplate(Base):
    """Céges / user egyedi mérési sablon (rpe, loop, insulation, rcd)."""
    __tablename__ = "measurement_templates"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(128), nullable=False)
    template_json = Column(JSON, nullable=False)  # { rpe: [], loop: [], insulation: [], rcd: [] }
    created_at = Column(DateTime, default=datetime.utcnow)


class ReportAuditLog(Base):
    """Jegyzőkönyv audit napló: ki nyitotta, exportálta, finalizálta (5.2)."""
    __tablename__ = "report_audit_log"
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(64), nullable=False, index=True)  # opened, exported_docx, exported_pdf, exported_diagram_pdf, finalized
    meta = Column(JSON, nullable=True)  # opcionális: ip, user_agent
    created_at = Column(DateTime, default=datetime.utcnow)
    report = relationship("Report", backref="audit_logs")
    user = relationship("User", backref="report_audit_entries")


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

Base.metadata.create_all(bind=engine)

# Migráció: company_settings.company_id (ha még nincs)
if SQLALCHEMY_DATABASE_URL and "sqlite" in SQLALCHEMY_DATABASE_URL:
    with engine.connect() as conn:
        try:
            r = conn.execute(__import__("sqlalchemy").text("PRAGMA table_info(company_settings)"))
            cols = [row[1] for row in r.fetchall()]
            if "company_id" not in cols:
                conn.execute(__import__("sqlalchemy").text("ALTER TABLE company_settings ADD COLUMN company_id INTEGER"))
                conn.commit()
            r2 = conn.execute(__import__("sqlalchemy").text("PRAGMA table_info(company_settings)"))
            cols2 = [row[1] for row in r2.fetchall()]
            if "signature_path" not in cols2:
                conn.execute(__import__("sqlalchemy").text("ALTER TABLE company_settings ADD COLUMN signature_path VARCHAR"))
                conn.commit()
            r3 = conn.execute(__import__("sqlalchemy").text("PRAGMA table_info(company_settings)"))
            cols3 = [row[1] for row in r3.fetchall()]
            if "pfx_path" not in cols3:
                conn.execute(__import__("sqlalchemy").text("ALTER TABLE company_settings ADD COLUMN pfx_path VARCHAR"))
                conn.commit()
            for col_name, col_type in [("docx_header_text", "TEXT"), ("docx_footer_text", "TEXT"), ("docx_primary_color", "VARCHAR(32)"), ("docx_embed_diagram", "INTEGER")]:
                rcx = conn.execute(__import__("sqlalchemy").text("PRAGMA table_info(company_settings)"))
                col_list = [row[1] for row in rcx.fetchall()]
                if col_name not in col_list:
                    conn.execute(__import__("sqlalchemy").text(f"ALTER TABLE company_settings ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
            # SaaS: companies plan + limits
            r4 = conn.execute(__import__("sqlalchemy").text("PRAGMA table_info(companies)"))
            cols4 = [row[1] for row in r4.fetchall()]
            if "plan" not in cols4:
                conn.execute(__import__("sqlalchemy").text("ALTER TABLE companies ADD COLUMN plan VARCHAR DEFAULT 'FREE'"))
                conn.commit()
            if "reports_per_month_limit" not in cols4:
                conn.execute(__import__("sqlalchemy").text("ALTER TABLE companies ADD COLUMN reports_per_month_limit INTEGER"))
                conn.commit()
            if "max_users" not in cols4:
                conn.execute(__import__("sqlalchemy").text("ALTER TABLE companies ADD COLUMN max_users INTEGER"))
                conn.commit()
            # payment_logs tábla (ha még nincs)
            try:
                r5 = conn.execute(__import__("sqlalchemy").text("SELECT name FROM sqlite_master WHERE type='table' AND name='payment_logs'"))
                if r5.fetchone() is None:
                    conn.execute(__import__("sqlalchemy").text("""
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
            # password_reset_tokens tábla (elfelejtett jelszó)
            try:
                r6 = conn.execute(__import__("sqlalchemy").text("SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens'"))
                if r6.fetchone() is None:
                    conn.execute(__import__("sqlalchemy").text("""
                        CREATE TABLE password_reset_tokens (
                            id INTEGER NOT NULL PRIMARY KEY,
                            user_id INTEGER NOT NULL,
                            token_hash VARCHAR(64) NOT NULL,
                            expires_at DATETIME NOT NULL,
                            created_at DATETIME,
                            FOREIGN KEY(user_id) REFERENCES users(id)
                        )
                    """))
                    conn.execute(__import__("sqlalchemy").text("CREATE INDEX ix_password_reset_tokens_token_hash ON password_reset_tokens (token_hash)"))
                    conn.commit()
            except Exception:
                pass
        except Exception:
            pass

# subscription_plans tábla: create_all létrehozza; seed ha üres
def _seed_subscription_plans():
    try:
        db = SessionLocal()
        if db.query(SubscriptionPlan).count() == 0:
            for i, (key, defaults) in enumerate([
                ("FREE", {"display_name": "Ingyenes", "reports": 5, "users": 2, "features": ["5 jegyzőkönyv/hó", "2 felhasználó", "Word/PDF export"]}),
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
