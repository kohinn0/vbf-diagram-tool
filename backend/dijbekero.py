"""
Díjbekérő PDF generálás – NAV-kötés nélküli fizetési felszólítás.
Céges adatok: IMPRINT_* env változókból.
Sorszám: dijbekero_sequences tábla (év-sorozat).
"""

import os
from io import BytesIO
from datetime import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def _issuer_data() -> dict:
    return {
        "company_name": os.getenv("IMPRINT_COMPANY_NAME", "SZIKORA ZOLTÁN EV"),
        "address": os.getenv("IMPRINT_SEAT", "2091 Etyek, Liliom köz 1, Magyarország"),
        "tax_no": os.getenv("IMPRINT_TAX_NO", "91460028-1-27"),
        "bank_account": os.getenv("IMPRINT_BANK_ACCOUNT", "11711113-20002781"),
        "nyilvantartasi": os.getenv("IMPRINT_NYILVANTARTASI", "61186846"),  # EV: nyilvántartási szám
    }


def get_next_sorszam(db: "Session") -> str:
    """Következő díjbekérő sorszám (pl. 2026-001). Frissíti a DB-t."""
    from database import DijbekeroSequence
    year = datetime.now().year
    row = db.query(DijbekeroSequence).filter(DijbekeroSequence.year == year).first()
    if not row:
        row = DijbekeroSequence(year=year, last_seq=0)
        db.add(row)
        db.flush()
    row.last_seq += 1
    return f"{year}-{row.last_seq:03d}"


def generate_dijbekero_pdf(
    amount_huf: Optional[int] = None,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    vevo_nev: Optional[str] = None,
    vevo_cim: Optional[str] = None,
    logo_path: Optional[str] = None,
    sorszam: Optional[str] = None,
) -> bytes:
    """
    Díjbekérő PDF generálása reportlab-bal. NAV-kötés nincs.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm

    data = _issuer_data()
    today = datetime.now().strftime("%Y.%m.%d")

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    # Cím + sorszám
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(w / 2, h - 25 * mm, "DÍJBEKÉRŐ")
    if sorszam:
        c.setFont("Helvetica", 10)
        c.drawString(w - 50 * mm, h - 25 * mm, f"Azon.: {sorszam}")

    # Logó (ha van) – jobb felső sarok
    if logo_path and os.path.exists(logo_path):
        try:
            from reportlab.lib.utils import ImageReader
            from PIL import Image
            img = Image.open(logo_path)
            img.load()
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            max_w_pt = 45 * mm
            max_h_pt = 25 * mm
            iw, ih = img.size
            if iw > 0 and ih > 0:
                scale_w = max_w_pt / iw
                scale_h = max_h_pt / ih
                scale = min(scale_w, scale_h, 1)
                dw, dh = iw * scale, ih * scale
                x = w - 20 * mm - dw
                y = h - 45 * mm - dh
                buf = BytesIO()
                img.save(buf, format="PNG")
                buf.seek(0)
                c.drawImage(ImageReader(buf), x, y, width=dw, height=dh)
        except Exception:
            pass

    # Számlakibocsátó
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, h - 45 * mm, "Számlakibocsátó:")
    c.setFont("Helvetica", 10)
    y = h - 50 * mm
    c.drawString(20 * mm, y, data["company_name"])
    y -= 5 * mm
    c.drawString(20 * mm, y, data["address"])
    y -= 5 * mm
    c.drawString(20 * mm, y, f"Adószám: {data['tax_no']}")
    y -= 5 * mm
    if data.get("nyilvantartasi"):
        c.drawString(20 * mm, y, f"Nyilvántartási szám: {data['nyilvantartasi']}")
        y -= 5 * mm
    c.drawString(20 * mm, y, f"Bankszámlaszám: {data['bank_account']}")

    # Közlemény javaslat
    kozlemeny = (vevo_nev or "").strip() or sorszam or "–"
    y -= 5 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "Közlemény (utaláskor írd be):")
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y - 5 * mm, kozlemeny[:60])

    # Közlési nap
    c.setFont("Helvetica", 10)
    c.drawString(w - 60 * mm, h - 45 * mm, f"Közlési nap: {today}")

    # Vevő (ha megadva)
    y = h - 85 * mm
    if vevo_nev or vevo_cim:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20 * mm, y, "Vevő:")
        c.setFont("Helvetica", 10)
        y -= 5 * mm
        if vevo_nev:
            c.drawString(20 * mm, y, vevo_nev[:80])
            y -= 5 * mm
        if vevo_cim:
            c.drawString(20 * mm, y, vevo_cim[:120])
            y -= 5 * mm
        y -= 5 * mm

    # Tartalom
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "A fizetendő összeg:")
    c.setFont("Helvetica", 12)
    y -= 7 * mm
    amount_str = f"{amount_huf:,} Ft".replace(",", " ") if amount_huf is not None else "–"
    c.drawString(20 * mm, y, amount_str)

    y -= 10 * mm
    if description:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20 * mm, y, "Leírás:")
        c.setFont("Helvetica", 10)
        y -= 6 * mm
        for line in (description[:200] or "").split("\n")[:5]:
            c.drawString(20 * mm, y, line[:90])
            y -= 5 * mm
        y -= 5 * mm

    if due_date:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20 * mm, y, "Fizetési határidő:")
        c.setFont("Helvetica", 10)
        c.drawString(70 * mm, y, due_date)

    # Lábléc
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(20 * mm, 15 * mm, "Ez a díjbekérő nem minősül hivatalos számlának. A NAV-hoz történő beküldésre a 2007. évi LXXX. tv. szerinti számla szükséges.")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def send_dijbekero_email(
    to_email: str,
    pdf_bytes: bytes,
    amount_huf: Optional[int] = None,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    vevo_nev: Optional[str] = None,
    sorszam: Optional[str] = None,
) -> None:
    """Díjbekérő PDF küldése a beállított SMTP-val sablon e-mailben (HTML)."""
    import smtplib
    from email.message import EmailMessage

    smtp_server = os.getenv("SMTP_SERVER", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    if not (smtp_server and smtp_user and smtp_pass):
        raise RuntimeError("SMTP nincs konfigurálva. Állítsd be SMTP_SERVER, SMTP_USER, SMTP_PASS.")

    data = _issuer_data()
    company = data["company_name"]
    bank = data["bank_account"]
    amount_str = f"{amount_huf:,} Ft".replace(",", " ") if amount_huf is not None else "–"
    desc = (description or "").strip() or "–"
    due = (due_date or "").strip() or "–"
    nev = (vevo_nev or "").strip() or "Vevő"
    kozl = (vevo_nev or "").strip() or sorszam or "díjbekérő azonosítója"

    subject = f"Díjbekérő – {company}"
    if sorszam:
        subject = f"Díjbekérő {sorszam} – {company}"

    plain = (
        f"Kedves {nev}!\n\n"
        f"Csatolva küldjük a díjbekérőt.\n\n"
        f"Fizetendő összeg: {amount_str}\n"
        f"Leírás: {desc}\n"
        f"Fizetési határidő: {due}\n\n"
        f"Utalási adat:\n"
        f"Bankszámlaszám: {bank}\n"
        f"Közlemény: {kozl}\n\n"
        f"Üdvözlettel,\n{company}"
    )

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 560px;">
  <p>Kedves <strong>{nev}</strong>!</p>
  <p>Csatolva küldjük a díjbekérőt.</p>
  <table style="border-collapse: collapse; margin: 1em 0;">
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Fizetendő összeg:</strong></td><td>{amount_str}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Leírás:</strong></td><td>{desc}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Fizetési határidő:</strong></td><td>{due}</td></tr>
  </table>
  <p><strong>Utalási adat:</strong><br>
  Bankszámlaszám: <code style="background: #f5f5f5; padding: 2px 6px;">{bank}</code><br>
  Közlemény: {kozl}</p>
  <p>Üdvözlettel,<br><strong>{company}</strong></p>
</body>
</html>
"""

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")
    msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename="dijbekero.pdf")

    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
