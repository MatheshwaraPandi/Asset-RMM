import datetime
from sqlalchemy.orm import Session

from . import models, schemas, security

DEFAULT_ASSET_STATUS = "In Use"
DEFAULT_ASSIGNMENT_STATUS = "Assigned"


def normalize_email(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def normalize_username(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def _normalize_asset_payload(data: dict):
    normalized = dict(data)
    for key in (
        "employee_name",
        "employee_id",
        "email",
        "employee_username",
        "laptop_username",
        "laptop_no",
        "charger_no",
        "mouse_no",
        "headset_no",
        "other_devices",
        "department",
        "location",
        "hostname",
        "brand",
        "model",
        "cpu",
        "ram",
        "storage",
    ):
        value = normalized.get(key)
        if isinstance(value, str):
            trimmed = value.strip()
            normalized[key] = (
                normalize_email(trimmed)
                if key == "email"
                else normalize_username(trimmed)
                if key in ("employee_username", "laptop_username")
                else (trimmed or None)
            )
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


def _create_asset_status_history(
    db: Session,
    *,
    asset_id: int,
    status: str,
    effective_date: str | None,
    updated_by: str | None,
):
    entry = models.AssetStatusHistory(
        asset_id=asset_id,
        status=status,
        effective_date=effective_date,
        updated_by=updated_by,
    )
    db.add(entry)
    return entry


def _create_assignment_history(
    db: Session,
    *,
    asset_id: int,
    assignment_status: str,
    effective_date: str | None,
    employee_name: str | None,
    employee_id: str | None,
    email: str | None,
    updated_by: str | None,
):
    entry = models.AssetAssignmentHistory(
        asset_id=asset_id,
        assignment_status=assignment_status,
        effective_date=effective_date,
        employee_name=employee_name,
        employee_id=employee_id,
        email=normalize_email(email),
        updated_by=updated_by,
    )
    db.add(entry)
    return entry


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
    now = datetime.datetime.utcnow()
    db_asset = models.Asset(**data)
    db_asset.last_updated = now
    db_asset.asset_status = DEFAULT_ASSET_STATUS
    db_asset.asset_status_date = now.date().isoformat()
    db_asset.asset_status_last_updated_at = now
    db_asset.assignment_status = DEFAULT_ASSIGNMENT_STATUS if any(
        data.get(key) for key in ("employee_name", "employee_id", "email")
    ) else "Unassigned"
    db_asset.assignment_status_date = now.date().isoformat()
    db_asset.assignment_status_last_updated_at = now
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset


def update_asset_assignment(
    db: Session,
    asset_id: int,
    update: schemas.AssetAssignmentUpdate,
    *,
    updated_by: str | None = None,
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        return None

    data = (
        update.model_dump(exclude_unset=True)
        if hasattr(update, "model_dump")
        else update.dict(exclude_unset=True)
    )
    data = _normalize_asset_payload(data)
    previous_employee = {
        "employee_name": db_asset.employee_name,
        "employee_id": db_asset.employee_id,
        "email": db_asset.email,
    }

    laptop_password = data.pop("laptop_password", None)
    if isinstance(laptop_password, str):
        laptop_password = laptop_password.strip()
        if laptop_password:
            db_asset.laptop_password_hash = security.hash_password(laptop_password)

    for key, value in data.items():
        setattr(db_asset, key, value)

    current_employee = {
        "employee_name": db_asset.employee_name,
        "employee_id": db_asset.employee_id,
        "email": db_asset.email,
    }
    now = datetime.datetime.utcnow()
    if previous_employee != current_employee:
        had_previous = any(previous_employee.values())
        has_current = any(current_employee.values())
        next_assignment_status = (
            "Reassigned" if had_previous and has_current else "Assigned" if has_current else "Unassigned"
        )
        db_asset.assignment_status = next_assignment_status
        db_asset.assignment_status_date = now.date().isoformat()
        db_asset.assignment_status_last_updated_at = now
        db_asset.assignment_status_last_updated_by = updated_by
        _create_assignment_history(
            db,
            asset_id=db_asset.id,
            assignment_status=next_assignment_status,
            effective_date=db_asset.assignment_status_date,
            employee_name=db_asset.employee_name,
            employee_id=db_asset.employee_id,
            email=db_asset.email,
            updated_by=updated_by,
        )

    db_asset.last_updated = now
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


def get_asset_by_username(db: Session, username: str):
    normalized = normalize_username(username)
    if not normalized:
        return None
    return (
        db.query(models.Asset)
        .filter(models.Asset.employee_username == normalized)
        .order_by(models.Asset.last_updated.desc())
        .first()
    )


def get_asset_by_login_identifier(db: Session, login: str):
    raw = (login or "").strip()
    if not raw:
        return None
    if "@" in raw:
        return get_asset_by_email(db, raw)
    return get_asset_by_username(db, raw) or get_asset_by_email(db, raw)


def set_employee_password(db: Session, asset_id: int, password_hash: str):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        return None
    db_asset.employee_password_hash = password_hash
    db_asset.last_updated = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_asset)
    return db_asset


def update_asset_credentials(
    db: Session,
    *,
    asset_id: int,
    employee_username: str | None = None,
    password_hash: str | None = None,
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        return None

    if employee_username is not None:
        db_asset.employee_username = normalize_username(employee_username)

    if password_hash is not None:
        db_asset.employee_password_hash = password_hash

    db_asset.last_updated = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_asset)
    return db_asset


def update_asset_employee_profile(
    db: Session,
    *,
    asset_id: int,
    update: schemas.EmployeeAssetSelfUpdate,
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        return None

    data = (
        update.model_dump(exclude_unset=True)
        if hasattr(update, "model_dump")
        else update.dict(exclude_unset=True)
    )
    data = _normalize_asset_payload(data)

    laptop_password = data.pop("laptop_password", None)
    if isinstance(laptop_password, str):
        laptop_password = laptop_password.strip()
        if laptop_password:
            db_asset.laptop_password_hash = security.hash_password(laptop_password)

    for key in ("employee_name", "email", "location", "other_devices", "laptop_username"):
        if key in data:
            setattr(db_asset, key, data[key])

    db_asset.last_updated = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_asset)
    return db_asset


def _normalize_component_payload(data: dict):
    normalized = dict(data)
    for key in (
        "component_type",
        "identifier",
        "brand",
        "model",
        "color",
        "status",
        "assigned_to",
        "location",
        "notes",
    ):
        value = normalized.get(key)
        if isinstance(value, str):
            normalized[key] = value.strip() or None
    return normalized


def get_asset_components(db: Session, asset_id: int):
    return (
        db.query(models.AssetComponent)
        .filter(models.AssetComponent.asset_id == asset_id)
        .order_by(models.AssetComponent.id)
        .all()
    )


def create_asset_component(
    db: Session,
    asset_id: int,
    component: schemas.AssetComponentCreate,
):
    data = (
        component.model_dump(exclude_unset=True)
        if hasattr(component, "model_dump")
        else component.dict(exclude_unset=True)
    )
    data = _normalize_component_payload(data)
    data["asset_id"] = asset_id
    db_component = models.AssetComponent(**data)
    db_component.last_updated = datetime.datetime.utcnow()
    db.add(db_component)
    db.commit()
    db.refresh(db_component)
    return db_component


def update_asset_component(
    db: Session,
    component_id: int,
    update: schemas.AssetComponentUpdate,
):
    db_component = (
        db.query(models.AssetComponent)
        .filter(models.AssetComponent.id == component_id)
        .first()
    )
    if not db_component:
        return None

    data = (
        update.model_dump(exclude_unset=True)
        if hasattr(update, "model_dump")
        else update.dict(exclude_unset=True)
    )
    data = _normalize_component_payload(data)
    for key, value in data.items():
        setattr(db_component, key, value)

    db_component.last_updated = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_component)
    return db_component


def delete_asset_component(db: Session, component_id: int):
    db_component = (
        db.query(models.AssetComponent)
        .filter(models.AssetComponent.id == component_id)
        .first()
    )
    if not db_component:
        return False
    db.delete(db_component)
    db.commit()
    return True


def get_asset_by_id(db: Session, asset_id: int):
    return db.query(models.Asset).filter(models.Asset.id == asset_id).first()


def get_asset_status_history(db: Session, asset_id: int):
    return (
        db.query(models.AssetStatusHistory)
        .filter(models.AssetStatusHistory.asset_id == asset_id)
        .order_by(models.AssetStatusHistory.created_at.desc())
        .all()
    )


def get_asset_assignment_history(db: Session, asset_id: int):
    return (
        db.query(models.AssetAssignmentHistory)
        .filter(models.AssetAssignmentHistory.asset_id == asset_id)
        .order_by(models.AssetAssignmentHistory.created_at.desc())
        .all()
    )


def update_asset_tracking(
    db: Session,
    *,
    asset_id: int,
    update: schemas.AssetTrackingUpdate,
    updated_by: str,
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not db_asset:
        return None

    now = datetime.datetime.utcnow()
    asset_status = (update.asset_status or "").strip() or DEFAULT_ASSET_STATUS
    assignment_status = (update.assignment_status or "").strip() or DEFAULT_ASSIGNMENT_STATUS
    asset_status_date = (update.asset_status_date or now.date().isoformat()).strip()
    assignment_status_date = (update.assignment_status_date or now.date().isoformat()).strip()

    if db_asset.asset_status != asset_status or db_asset.asset_status_date != asset_status_date:
        db_asset.asset_status = asset_status
        db_asset.asset_status_date = asset_status_date
        db_asset.asset_status_last_updated_at = now
        db_asset.asset_status_last_updated_by = updated_by
        _create_asset_status_history(
            db,
            asset_id=db_asset.id,
            status=asset_status,
            effective_date=asset_status_date,
            updated_by=updated_by,
        )

    if db_asset.assignment_status != assignment_status or db_asset.assignment_status_date != assignment_status_date:
        db_asset.assignment_status = assignment_status
        db_asset.assignment_status_date = assignment_status_date
        db_asset.assignment_status_last_updated_at = now
        db_asset.assignment_status_last_updated_by = updated_by
        _create_assignment_history(
            db,
            asset_id=db_asset.id,
            assignment_status=assignment_status,
            effective_date=assignment_status_date,
            employee_name=db_asset.employee_name,
            employee_id=db_asset.employee_id,
            email=db_asset.email,
            updated_by=updated_by,
        )

    db_asset.last_updated = now
    db.commit()
    db.refresh(db_asset)
    return db_asset


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


def delete_active_password_reset_tokens_for_email(db: Session, email: str):
    normalized = normalize_email(email)
    if not normalized:
        return
    (
        db.query(models.PasswordResetToken)
        .filter(
            models.PasswordResetToken.email == normalized,
            models.PasswordResetToken.consumed_at.is_(None),
        )
        .delete(synchronize_session=False)
    )
    db.commit()


def create_password_reset_token(
    db: Session,
    *,
    email: str,
    token: str,
    asset_id: int,
    expires_at: datetime.datetime,
):
    reset_entry = models.PasswordResetToken(
        email=normalize_email(email),
        token=token,
        asset_id=asset_id,
        expires_at=expires_at,
    )
    db.add(reset_entry)
    db.commit()
    db.refresh(reset_entry)
    return reset_entry


def get_valid_password_reset_token(db: Session, *, token: str):
    now = datetime.datetime.utcnow()
    return (
        db.query(models.PasswordResetToken)
        .filter(
            models.PasswordResetToken.token == token,
            models.PasswordResetToken.consumed_at.is_(None),
            models.PasswordResetToken.expires_at >= now,
        )
        .order_by(models.PasswordResetToken.created_at.desc())
        .first()
    )


def delete_password_reset_token_by_value(db: Session, *, token: str):
    (
        db.query(models.PasswordResetToken)
        .filter(models.PasswordResetToken.token == token)
        .delete(synchronize_session=False)
    )
    db.commit()
