import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import crud, models, schemas, security
from .database import SessionLocal, engine, get_db
from .migrate import ensure_sqlite_columns

# SQLite auto-migration for local dev
ensure_sqlite_columns(engine)

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="RMM Lite API")

origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://192.168.0.21:3000")
allow_origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def ensure_default_admin(db: Session) -> None:
    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "admin123")

    existing = crud.get_admin_by_username(db, username=username)
    if existing:
        return

    db_admin = models.Admin(username=username, hashed_password=security.hash_password(password))
    db.add(db_admin)
    db.commit()


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        ensure_default_admin(db)
    finally:
        db.close()


def require_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = security.decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    username = payload.get("sub") if isinstance(payload, dict) else None
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")

    admin = crud.get_admin_by_username(db, username=username)
    if not admin:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return admin


@app.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = crud.get_admin_by_username(db, username=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token = security.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/register-asset", status_code=201)
def register_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db)):
    crud.create_or_update_asset(db, asset)
    return {"message": "System info updated successfully"}


@app.get("/assets")
def get_assets(db: Session = Depends(get_db)):
    return crud.get_assets(db)


@app.get("/public/assets/{asset_id}")
def get_public_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@app.put("/assets/{asset_id}")
def update_asset(
    asset_id: int,
    update: schemas.AssetAssignmentUpdate,
    db: Session = Depends(get_db),
    _: models.Admin = Depends(require_admin),
):
    asset = crud.update_asset_assignment(db, asset_id, update)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
