from sqlalchemy import Column, DateTime, Integer, String
import datetime

from .database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)

    # Admin-entered assignment details
    employee_name = Column(String, nullable=True)
    employee_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, nullable=True)
    laptop_no = Column(String, nullable=True)
    charger_no = Column(String, nullable=True)
    mouse_no = Column(String, nullable=True)

    # Agent-collected system info
    hostname = Column(String, nullable=True)
    os_name = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    serial_number = Column(String, index=True, nullable=True)
    cpu = Column(String, nullable=True)
    ram = Column(String, nullable=True)
    storage = Column(String, nullable=True)

    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
