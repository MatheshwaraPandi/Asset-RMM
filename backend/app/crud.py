import datetime
from sqlalchemy.orm import Session

from . import models, schemas


def normalize_email(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def _normalize_asset_payload(data: dict):
    normalized = dict(data)
    for key in ("employee_name", "employee_id", "email", "laptop_no", "charger_no", "mouse_no", "department", "location"):
        value = normalized.get(key)
        if isinstance(value, str):
            trimmed = value.strip()
            normalized[key] = normalize_email(trimmed) if key == "email" else (trimmed or None)
    return normalized


def get_assets(db: Session):
    return db.query(models.Asset).order_by(models.Asset.last_updated.desc()).all()


def get_assets_for_email(db: Session, email: str):
    normalized = normalize_email(email)
    if not normalized:
        return []
    return (
        db.query(models.Asset)
        .filter(models.Asset.email == normalized)
        .order_by(models.Asset.last_updated.desc())
        .all()
    )


def create_or_update_asset(db: Session, asset: schemas.AssetCreate):
    data = (
        asset.model_dump(exclude_unset=True)
        if hasattr(asset, "model_dump")
        else asset.dict(exclude_unset=True)
    )
    data = _normalize_asset_payload(data)

    db_asset = None

    employee_id = data.get("employee_id")
    if employee_id:
        db_asset = db.query(models.Asset).filter(models.Asset.employee_id == employee_id).first()

    serial = data.get("serial_number")
    if not db_asset and serial:
        db_asset = (
            db.query(models.Asset)
            .filter(models.Asset.serial_number == serial)
            .order_by(models.Asset.last_updated.desc())
            .first()
        )

    if db_asset:
        for key, value in data.items():
            if value is not None:
                setattr(db_asset, key, value)
        db_asset.last_updated = datetime.datetime.utcnow()
    else:
        db_asset = models.Asset(**data)
        db_asset.last_updated = datetime.datetime.utcnow()
        db.add(db_asset)

    db.commit()
    db.refresh(db_asset)
    return db_asset


def create_manual_asset(db: Session, asset: schemas.AssetManualCreate):
    data = (
        asset.model_dump(exclude_unset=True)
        if hasattr(asset, "model_dump")
        else asset.dict(exclude_unset=True)
    )
    data = _normalize_asset_payload(data)
    db_asset = models.Asset(**data)
    db_asset.last_updated = datetime.datetime.utcnow()
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset


def update_asset_assignment(db: Session, asset_id: int, update: schemas.AssetAssignmentUpdate):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        return None

    data = (
        update.model_dump(exclude_unset=True)
        if hasattr(update, "model_dump")
        else update.dict(exclude_unset=True)
    )
    data = _normalize_asset_payload(data)

    for key, value in data.items():
        setattr(db_asset, key, value)

    db_asset.last_updated = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_asset)
    return db_asset


def update_asset_service(
    db: Session,
    asset_id: int,
    update: schemas.AssetServiceUpdate,
    updated_by: str,
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        return None

    data = (
        update.model_dump(exclude_unset=True)
        if hasattr(update, "model_dump")
        else update.dict(exclude_unset=True)
    )

    for key, value in data.items():
        setattr(db_asset, key, value)

    db_asset.service_last_updated_by = updated_by
    db_asset.last_updated = datetime.datetime.utcnow()

    db.commit()
    db.refresh(db_asset)
    return db_asset


def get_admin_by_username(db: Session, username: str):
    return db.query(models.Admin).filter(models.Admin.username == username).first()


def get_asset_by_email(db: Session, email: str):
    normalized = normalize_email(email)
    if not normalized:
        return None
    return (
        db.query(models.Asset)
        .filter(models.Asset.email == normalized)
        .order_by(models.Asset.last_updated.desc())
        .first()
    )


def get_asset_by_id(db: Session, asset_id: int):
    return db.query(models.Asset).filter(models.Asset.id == asset_id).first()


def delete_asset(db: Session, asset_id: int):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        return False

    db.delete(db_asset)
    db.commit()
    return True


def get_asset_by_upload_token(db: Session, token: str):
    return db.query(models.Asset).filter(models.Asset.upload_token == token).first()


def delete_active_otps_for_email(db: Session, email: str):
    normalized = normalize_email(email)
    if not normalized:
        return
    (
        db.query(models.LoginOTP)
        .filter(models.LoginOTP.email == normalized, models.LoginOTP.consumed_at.is_(None))
        .delete(synchronize_session=False)
    )
    db.commit()


def create_login_otp(
    db: Session,
    *,
    email: str,
    hashed_code: str,
    asset_id: int,
    expires_at: datetime.datetime,
):
    otp_entry = models.LoginOTP(
        email=normalize_email(email),
        hashed_code=hashed_code,
        asset_id=asset_id,
        expires_at=expires_at,
    )
    db.add(otp_entry)
    db.commit()
    db.refresh(otp_entry)
    return otp_entry


def get_latest_valid_login_otp(db: Session, *, email: str):
    normalized = normalize_email(email)
    if not normalized:
        return None
    now = datetime.datetime.utcnow()
    return (
        db.query(models.LoginOTP)
        .filter(
            models.LoginOTP.email == normalized,
            models.LoginOTP.consumed_at.is_(None),
            models.LoginOTP.expires_at >= now,
        )
        .order_by(models.LoginOTP.created_at.desc())
        .first()
    )
