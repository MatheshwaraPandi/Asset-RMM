import datetime
from sqlalchemy.orm import Session

from . import models, schemas


def get_assets(db: Session):
    return db.query(models.Asset).order_by(models.Asset.last_updated.desc()).all()


def create_or_update_asset(db: Session, asset: schemas.AssetCreate):
    # Only update fields that were actually sent.
    data = (
        asset.model_dump(exclude_unset=True)
        if hasattr(asset, "model_dump")
        else asset.dict(exclude_unset=True)
    )

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


def update_asset_assignment(db: Session, asset_id: int, update: schemas.AssetAssignmentUpdate):
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

    db.commit()
    db.refresh(db_asset)
    return db_asset


def get_admin_by_username(db: Session, username: str):
    return db.query(models.Admin).filter(models.Admin.username == username).first()
