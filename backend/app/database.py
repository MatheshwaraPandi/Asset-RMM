import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

BASE_DIR = Path(__file__).resolve().parent
BACKEND_ENV_PATH = BASE_DIR.parent / ".env"

load_dotenv(BACKEND_ENV_PATH)


def _can_safely_replace_files(directory: Path) -> bool:
    directory.mkdir(parents=True, exist_ok=True)
    source = directory / ".fs-write-check.tmp"
    target = directory / ".fs-write-check.done"

    try:
        source.write_text("ok", encoding="utf-8")
        source.replace(target)
        target.unlink()
        return True
    except OSError:
        for candidate in (source, target):
            try:
                if candidate.exists():
                    candidate.unlink()
            except OSError:
                pass
        return False


def _default_sqlite_url() -> str:
    if _can_safely_replace_files(BASE_DIR):
        return f"sqlite:///{(BASE_DIR / 'rmm.db').as_posix()}"

    temp_dir = Path(tempfile.gettempdir()) / "asset-rmm"
    temp_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{(temp_dir / 'rmm.db').as_posix()}"


# Production should set DATABASE_URL to PostgreSQL.
# Local/dev falls back to SQLite automatically.
DEFAULT_SQLITE_URL = _default_sqlite_url()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
