import os
import secrets
import smtplib
import shutil
from dataclasses import dataclass
from datetime import datetime, timedelta
from email.message import EmailMessage
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import crud, models, schemas, security
from .database import SessionLocal, engine, get_db
from .migrate import ensure_sqlite_columns

ensure_sqlite_columns(engine)
models.Base.metadata.create_all(bind=engine)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="RMM Lite API")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


def _get_allowed_origins() -> list[str]:
    configured = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("NEXT_PUBLIC_APP_URL", ""),
        os.getenv("NEXTAUTH_URL", ""),
    ]
    configured.extend(os.getenv("CORS_ORIGINS", "").split(","))

    allow_origins: list[str] = []
    for origin in configured:
        cleaned = origin.strip()
        if cleaned and cleaned not in allow_origins:
            allow_origins.append(cleaned)
    return allow_origins


allow_origins = _get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@dataclass
class AuthenticatedUser:
    username: str
    role: str
    email: str | None = None
    name: str | None = None
    asset_id: int | None = None


def ensure_default_users(db: Session) -> None:
    defaults = [
        (
            os.getenv("ADMIN_USERNAME", "admin"),
            os.getenv("ADMIN_PASSWORD", "admin123"),
            "admin",
        ),
        (
            os.getenv("HR_USERNAME", "hradmin"),
            os.getenv("HR_PASSWORD", "hr123"),
            "hr",
        ),
    ]

    for username, password, role in defaults:
        existing = crud.get_admin_by_username(db, username=username)
        if existing:
            if getattr(existing, "role", None) != role:
                existing.role = role
                db.commit()
            continue

        db_user = models.Admin(
            username=username,
            hashed_password=security.hash_password(password),
            role=role,
        )
        db.add(db_user)
        db.commit()


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        ensure_default_users(db)
    finally:
        db.close()


def _issue_session_payload(*, subject: str, role: str, email: str | None = None, name: str | None = None, asset_id: int | None = None):
    access_token = security.create_access_token(
        data={
            "sub": subject,
            "role": role,
            "email": email,
            "name": name,
            "asset_id": asset_id,
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "name": name,
        "email": email,
        "asset_id": asset_id,
    }


def _send_email(*, recipient: str, subject: str, lines: list[str]) -> None:
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    sender = os.getenv("SMTP_FROM_EMAIL", username).strip()
    use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() != "false"

    if not host or not sender:
        raise HTTPException(status_code=503, detail="Email is not configured on the server")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content("\n".join(lines))

    try:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            if use_tls:
                smtp.starttls()
            if username:
                smtp.login(username, password)
            smtp.send_message(message)
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=503,
            detail="Email delivery failed: SMTP authentication was rejected. Check SMTP username/password or app password settings.",
        )
    except smtplib.SMTPException:
        raise HTTPException(
            status_code=503,
            detail="Email delivery failed due to an SMTP error. Check the mail server settings and try again.",
        )


def _send_otp_email(*, recipient: str, code: str, asset_name: str | None) -> None:
    _send_email(
        recipient=recipient,
        subject=f"{os.getenv('OTP_EMAIL_SUBJECT', 'Your RMM Lite login code')}",
        lines=[
            f"Hello {asset_name or 'team member'},",
            "",
            f"Your one-time login code is: {code}",
            "",
            "This code expires in 10 minutes.",
            "If you did not request this login, you can ignore this email.",
        ],
    )


def _get_app_base_url() -> str:
    return (
        os.getenv("NEXT_PUBLIC_APP_URL", "").strip()
        or os.getenv("NEXTAUTH_URL", "").strip()
        or "http://localhost:3000"
    ).rstrip("/")


def _send_password_reset_email(*, recipient: str, asset_name: str | None, token: str) -> None:
    reset_url = f"{_get_app_base_url()}/reset-password?token={quote(token)}"
    _send_email(
        recipient=recipient,
        subject=os.getenv("RESET_PASSWORD_EMAIL_SUBJECT", "Reset your RMM Lite password"),
        lines=[
            f"Hello {asset_name or 'team member'},",
            "",
            "We received a request to reset your password.",
            f"Reset your password here: {reset_url}",
            "",
            "This link expires in 30 minutes.",
            "If you did not request this, you can ignore this email.",
        ],
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = security.decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not isinstance(payload, dict):
        raise HTTPException(status_code=401, detail="Invalid token")

    role = payload.get("role")
    subject = payload.get("sub")
    if not role or not subject:
        raise HTTPException(status_code=401, detail="Invalid token")

    if role in {"admin", "hr"}:
        user = crud.get_admin_by_username(db, username=subject)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        return AuthenticatedUser(
            username=user.username,
            role=user.role,
            email=None,
            name=user.username,
        )

    if role == "employee":
        asset_id = payload.get("asset_id")
        email = crud.normalize_email(payload.get("email"))
        
        asset = None
        if asset_id:
            asset = crud.get_asset_by_id(db, asset_id)
        if not asset and email:
            asset = crud.get_asset_by_email(db, email)
            
        if not asset:
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        email = email or getattr(asset, "email", None)
        return AuthenticatedUser(
            username=email or subject or str(asset.id),
            role="employee",
            email=email,
            name=getattr(asset, "employee_name", None) or email or subject,
            asset_id=asset.id,
        )

    raise HTTPException(status_code=401, detail="Unauthorized")


def require_roles(*roles: str):
    allowed_roles = set(roles)

    def dependency(user: AuthenticatedUser = Depends(get_current_user)):
        if allowed_roles and getattr(user, "role", None) not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return dependency


def _safe_image_ext(filename: str, content_type: Optional[str]) -> str:
    name = (filename or "").lower()
    if name.endswith(".png"):
        return ".png"
    if name.endswith(".jpg") or name.endswith(".jpeg"):
        return ".jpg"
    if content_type == "image/png":
        return ".png"
    if content_type == "image/jpeg":
        return ".jpg"
    raise HTTPException(status_code=400, detail="Only PNG/JPG images are allowed")


def _safe_invoice_ext(filename: str, content_type: Optional[str]) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return ".pdf"
    if name.endswith(".png"):
        return ".png"
    if name.endswith(".jpg") or name.endswith(".jpeg"):
        return ".jpg"
    if content_type == "application/pdf":
        return ".pdf"
    if content_type == "image/png":
        return ".png"
    if content_type == "image/jpeg":
        return ".jpg"
    raise HTTPException(status_code=400, detail="Only PDF, PNG, and JPG invoices are allowed")


def _save_upload(asset_id: int, token: str, field: str, upload: UploadFile) -> str:
    ext = _safe_image_ext(upload.filename or "", upload.content_type)
    filename = f"{asset_id}_{token[:8]}_{field}{ext}"
    path = UPLOAD_DIR / filename

    with path.open("wb") as file_obj:
        shutil.copyfileobj(upload.file, file_obj)

    return f"/uploads/{filename}"


def _save_invoice(asset_id: int, upload: UploadFile) -> str:
    ext = _safe_invoice_ext(upload.filename or "", upload.content_type)
    filename = f"{asset_id}_service_invoice{ext}"
    path = UPLOAD_DIR / filename

    with path.open("wb") as file_obj:
        shutil.copyfileobj(upload.file, file_obj)

    return f"/uploads/{filename}"


@app.post("/token", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    ensure_default_users(db)
    user = crud.get_admin_by_username(db, username=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    return _issue_session_payload(
        subject=user.username,
        role=user.role,
        name=user.username,
    )


@app.get("/me", response_model=schemas.SessionUserOut)
def get_me(user: AuthenticatedUser = Depends(get_current_user)):
    return {
        "username": user.username,
        "role": user.role,
        "email": user.email,
        "name": user.name,
        "asset_id": user.asset_id,
    }


@app.post("/auth/request-otp", response_model=schemas.OTPRequestOut)
def request_otp(
    payload: schemas.OTPRequest,
    db: Session = Depends(get_db),
):
    email = crud.normalize_email(payload.email)
    asset = crud.get_asset_by_email(db, email or "")
    if not asset:
        raise HTTPException(status_code=404, detail="No employee asset is assigned to that email")

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_in_seconds = int(os.getenv("OTP_EXPIRE_SECONDS", "600"))
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in_seconds)

    crud.delete_active_otps_for_email(db, email or "")
    crud.create_login_otp(
        db,
        email=email or "",
        hashed_code=security.hash_password(code),
        asset_id=asset.id,
        expires_at=expires_at,
    )
    _send_otp_email(recipient=email or "", code=code, asset_name=asset.employee_name)

    return {
        "message": "OTP sent to your email address",
        "expires_in_seconds": expires_in_seconds,
    }


@app.post("/auth/verify-otp", response_model=schemas.Token)
def verify_otp(
    payload: schemas.OTPVerify,
    db: Session = Depends(get_db),
):
    email = crud.normalize_email(payload.email)
    asset = crud.get_asset_by_email(db, email or "")
    if not asset:
        raise HTTPException(status_code=404, detail="No employee asset is assigned to that email")

    otp_entry = crud.get_latest_valid_login_otp(db, email=email or "")
    if not otp_entry or not security.verify_password(payload.otp.strip(), otp_entry.hashed_code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    otp_entry.consumed_at = datetime.utcnow()
    db.commit()

    return _issue_session_payload(
        subject=email or "",
        role="employee",
        email=email,
        name=asset.employee_name or email,
        asset_id=asset.id,
    )


@app.post("/auth/employee-login", response_model=schemas.Token)
def employee_login(
    payload: schemas.EmployeeLogin,
    db: Session = Depends(get_db),
):
    asset = crud.get_asset_by_login_identifier(db, payload.login)
    if not asset:
        raise HTTPException(status_code=404, detail="No employee asset matches that username or organization email")

    stored_password_hash = getattr(asset, "employee_password_hash", None)
    if not stored_password_hash or not security.verify_password(payload.password, stored_password_hash):
        raise HTTPException(status_code=400, detail="Invalid username/email or password")

    email = crud.normalize_email(getattr(asset, "email", None))
    login_subject = crud.normalize_username(getattr(asset, "employee_username", None)) or email or payload.login.strip()

    return _issue_session_payload(
        subject=login_subject,
        role="employee",
        email=email,
        name=asset.employee_name or email,
        asset_id=asset.id,
    )


@app.post("/auth/change-password", response_model=schemas.MessageOut)
def change_employee_password(
    payload: schemas.EmployeePasswordChange,
    db: Session = Depends(get_db),
):
    asset = crud.get_asset_by_login_identifier(db, payload.login)
    if not asset:
        raise HTTPException(status_code=404, detail="No employee asset matches that username or organization email")

    stored_password_hash = getattr(asset, "employee_password_hash", None)
    if not stored_password_hash or not security.verify_password(payload.old_password, stored_password_hash):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    new_password = payload.new_password.strip()
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")

    crud.update_asset_credentials(
        db,
        asset_id=asset.id,
        password_hash=security.hash_password(new_password),
    )
    return {"message": "Password updated successfully. You can now sign in with the new password."}


@app.post("/auth/forgot-password", response_model=schemas.MessageOut)
def forgot_password(
    payload: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = crud.normalize_email(payload.email)
    asset = crud.get_asset_by_email(db, email or "")
    if not asset:
        raise HTTPException(status_code=404, detail="No employee asset is assigned to that organization email")

    expires_in_seconds = int(os.getenv("PASSWORD_RESET_EXPIRE_SECONDS", "1800"))
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in_seconds)
    reset_token = secrets.token_urlsafe(32)

    crud.delete_active_password_reset_tokens_for_email(db, email or "")
    crud.create_password_reset_token(
        db,
        email=email or "",
        token=reset_token,
        asset_id=asset.id,
        expires_at=expires_at,
    )
    try:
        _send_password_reset_email(
            recipient=email or "",
            asset_name=asset.employee_name,
            token=reset_token,
        )
    except HTTPException:
        crud.delete_password_reset_token_by_value(db, token=reset_token)
        raise

    return {"message": "Password reset link sent to your organization email"}


@app.post("/auth/reset-password", response_model=schemas.MessageOut)
def reset_password(
    payload: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    new_password = payload.password.strip()
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    reset_entry = crud.get_valid_password_reset_token(db, token=payload.token.strip())
    if not reset_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    asset = crud.get_asset_by_id(db, reset_entry.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    crud.set_employee_password(
        db,
        asset_id=asset.id,
        password_hash=security.hash_password(new_password),
    )
    reset_entry.consumed_at = datetime.utcnow()
    db.commit()

    return {"message": "Password updated successfully. You can now sign in."}


@app.post("/register-asset", status_code=201)
def register_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db)):
    crud.create_or_update_asset(db, asset)
    return {"message": "System info updated successfully"}


@app.get("/assets", response_model=list[schemas.AssetOut])
def get_assets(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("admin", "hr", "employee")),
):
    if user.role == "employee":
        return crud.get_assets_for_email(db, user.email or "")
    return crud.get_assets(db)


@app.get("/assets/{asset_id}", response_model=schemas.AssetOut)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("admin", "hr", "employee")),
):
    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if user.role == "employee":
        if user.asset_id != asset_id and crud.normalize_email(asset.email) != crud.normalize_email(user.email):
            raise HTTPException(status_code=403, detail="Forbidden")
    return asset


@app.post("/assets", response_model=schemas.AssetOut, status_code=201)
def create_asset(
    asset: schemas.AssetManualCreate,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(require_roles("admin", "hr")),
):
    return crud.create_manual_asset(db, asset)


@app.delete("/assets/{asset_id}", status_code=204)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(require_roles("admin", "hr")),
):
    deleted = crud.delete_asset(db, asset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Asset not found")
    return None


@app.put("/assets/{asset_id}", response_model=schemas.AssetOut)
def update_asset(
    asset_id: int,
    update: schemas.AssetAssignmentUpdate,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    payload = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
    laptop_password = (payload.get("laptop_password") or "").strip()
    if laptop_password and len(laptop_password) < 8:
        raise HTTPException(status_code=400, detail="Laptop password must be at least 8 characters long")

    asset = crud.update_asset_assignment(db, asset_id, update, updated_by=user.username)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@app.get("/assets/{asset_id}/credentials", response_model=schemas.AssetCredentialsOut)
def get_asset_credentials(
    asset_id: int,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {
        "id": asset.id,
        "employee_username": getattr(asset, "employee_username", None),
        "email": getattr(asset, "email", None),
        "password_configured": bool(getattr(asset, "employee_password_hash", None)),
    }


@app.put("/assets/{asset_id}/credentials", response_model=schemas.AssetCredentialsOut)
def update_asset_credentials(
    asset_id: int,
    payload: schemas.AssetCredentialsUpdate,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)
    password = (data.get("password") or "").strip()
    username = data.get("employee_username")

    if password and len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    asset = crud.update_asset_credentials(
        db,
        asset_id=asset_id,
        employee_username=username,
        password_hash=security.hash_password(password) if password else None,
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {
        "id": asset.id,
        "employee_username": getattr(asset, "employee_username", None),
        "email": getattr(asset, "email", None),
        "password_configured": bool(getattr(asset, "employee_password_hash", None)),
    }


@app.put("/assets/{asset_id}/self-service", response_model=schemas.AssetOut)
def update_employee_asset_self_service(
    asset_id: int,
    payload: schemas.EmployeeAssetSelfUpdate,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("employee")),
):
    data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)
    laptop_password = (data.get("laptop_password") or "").strip()
    if laptop_password and len(laptop_password) < 8:
        raise HTTPException(status_code=400, detail="Laptop password must be at least 8 characters long")

    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if user.asset_id != asset_id and crud.normalize_email(asset.email) != crud.normalize_email(user.email):
        raise HTTPException(status_code=403, detail="Forbidden")

    updated = crud.update_asset_employee_profile(
        db,
        asset_id=asset_id,
        update=payload,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Asset not found")
    return updated


@app.post("/assets/{asset_id}/self-service-upload-token", response_model=schemas.UploadTokenOut)
def ensure_employee_upload_token(
    asset_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("employee")),
):
    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if user.asset_id != asset_id and crud.normalize_email(asset.email) != crud.normalize_email(user.email):
        raise HTTPException(status_code=403, detail="Forbidden")

    if not asset.upload_token:
        asset.upload_token = secrets.token_urlsafe(24)
        db.commit()
        db.refresh(asset)

    return {"upload_token": asset.upload_token}


@app.get("/assets/{asset_id}/components", response_model=list[schemas.AssetComponentOut])
def get_asset_components(
    asset_id: int,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return crud.get_asset_components(db, asset_id)


@app.post("/assets/{asset_id}/components", response_model=schemas.AssetComponentOut, status_code=201)
def create_asset_component(
    asset_id: int,
    payload: schemas.AssetComponentCreate,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    component = crud.create_asset_component(db, asset_id, payload)
    return component


@app.put("/components/{component_id}", response_model=schemas.AssetComponentOut)
def update_asset_component(
    component_id: int,
    payload: schemas.AssetComponentUpdate,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    component = crud.update_asset_component(db, component_id, payload)
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    return component


@app.delete("/components/{component_id}", status_code=204)
def delete_asset_component(
    component_id: int,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    deleted = crud.delete_asset_component(db, component_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Component not found")
    return None


@app.get("/assets/{asset_id}/tracking", response_model=schemas.AssetTrackingOut)
def get_asset_tracking(
    asset_id: int,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {
        "asset": asset,
        "status_history": crud.get_asset_status_history(db, asset_id),
        "assignment_history": crud.get_asset_assignment_history(db, asset_id),
    }


@app.put("/assets/{asset_id}/tracking", response_model=schemas.AssetTrackingOut)
def update_asset_tracking(
    asset_id: int,
    update: schemas.AssetTrackingUpdate,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    asset = crud.update_asset_tracking(
        db,
        asset_id=asset_id,
        update=update,
        updated_by=user.username,
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {
        "asset": asset,
        "status_history": crud.get_asset_status_history(db, asset_id),
        "assignment_history": crud.get_asset_assignment_history(db, asset_id),
    }


@app.put("/assets/{asset_id}/service", response_model=schemas.AssetOut)
def update_service(
    asset_id: int,
    update: schemas.AssetServiceUpdate,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    asset = crud.update_asset_service(db, asset_id, update, updated_by=user.username)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@app.post("/assets/{asset_id}/service-invoice", response_model=schemas.AssetOut)
def upload_service_invoice(
    asset_id: int,
    invoice: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("admin", "hr")),
):
    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.service_invoice_path = _save_invoice(asset_id, invoice)
    asset.service_last_updated_by = user.username
    db.commit()
    db.refresh(asset)
    return asset


@app.post("/assets/{asset_id}/upload-token", response_model=schemas.UploadTokenOut)
def create_upload_token(
    asset_id: int,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(require_roles("admin", "hr")),
):
    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not asset.upload_token:
        asset.upload_token = secrets.token_urlsafe(24)
        db.commit()
        db.refresh(asset)

    return {"upload_token": asset.upload_token}


@app.get("/public/upload/{token}", response_model=schemas.PublicUploadInfoOut)
def get_public_upload_info(token: str, db: Session = Depends(get_db)):
    asset = crud.get_asset_by_upload_token(db, token=token)
    if not asset:
        raise HTTPException(status_code=404, detail="Upload link not found")
    return asset


@app.post("/public/upload/{token}", response_model=schemas.AssetOut)
def upload_images(
    token: str,
    laptop_front: UploadFile | None = File(default=None),
    laptop_rear: UploadFile | None = File(default=None),
    mouse: UploadFile | None = File(default=None),
    charger: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    asset = crud.get_asset_by_upload_token(db, token=token)
    if not asset:
        raise HTTPException(status_code=404, detail="Upload link not found")

    if not any([laptop_front, laptop_rear, mouse, charger]):
        raise HTTPException(status_code=400, detail="No files provided")

    if laptop_front:
        asset.laptop_front_image = _save_upload(asset.id, token, "laptop_front", laptop_front)
    if laptop_rear:
        asset.laptop_rear_image = _save_upload(asset.id, token, "laptop_rear", laptop_rear)
    if mouse:
        asset.mouse_image = _save_upload(asset.id, token, "mouse", mouse)
    if charger:
        asset.charger_image = _save_upload(asset.id, token, "charger", charger)

    db.commit()
    db.refresh(asset)
    return asset


@app.get("/public/asset/{asset_id}", response_model=schemas.AssetOut)
def get_public_asset(
    asset_id: int,
    db: Session = Depends(get_db),
):
    """Get asset details without authentication - used for QR code scanning."""
    asset = crud.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
