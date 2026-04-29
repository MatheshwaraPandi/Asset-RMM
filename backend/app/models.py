from sqlalchemy import Column, DateTime, Integer, String
import datetime

from .database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="admin")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)

    # Admin-entered assignment details
    employee_name = Column(String, nullable=True)
    employee_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, nullable=True)
    employee_username = Column(String, nullable=True)
    employee_password_hash = Column(String, nullable=True)
    laptop_no = Column(String, nullable=True)
    charger_no = Column(String, nullable=True)
    mouse_no = Column(String, nullable=True)
    headset_no = Column(String, nullable=True)
    other_devices = Column(String, nullable=True)
    department = Column(String, nullable=True)
    location = Column(String, nullable=True)

    # Employee upload link token (secret URL, no login)
    upload_token = Column(String, unique=True, index=True, nullable=True)

    # Image paths (served from /uploads)
    laptop_front_image = Column(String, nullable=True)
    laptop_rear_image = Column(String, nullable=True)
    mouse_image = Column(String, nullable=True)
    charger_image = Column(String, nullable=True)
    service_invoice_path = Column(String, nullable=True)

    # Agent-collected system info
    hostname = Column(String, nullable=True)
    os_name = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    model_number = Column(String, nullable=True)
    serial_number = Column(String, index=True, nullable=True)
    cpu = Column(String, nullable=True)
    number_of_cpus = Column(String, nullable=True)
    cores_per_cpu = Column(String, nullable=True)
    logical_processors = Column(String, nullable=True)
    ram = Column(String, nullable=True)
    storage = Column(String, nullable=True)
    network_connection = Column(String, nullable=True)
    os_installation_date = Column(String, nullable=True)
    user_accounts = Column(String, nullable=True)
    service_status = Column(String, nullable=True)
    service_notes = Column(String, nullable=True)
    service_vendor = Column(String, nullable=True)
    service_handover_date = Column(String, nullable=True)
    service_return_date = Column(String, nullable=True)
    service_invoice_number = Column(String, nullable=True)
    service_invoice_amount = Column(String, nullable=True)
    service_last_updated_by = Column(String, nullable=True)
    asset_status = Column(String, nullable=True, default="In Use")
    asset_status_date = Column(String, nullable=True)
    asset_status_last_updated_at = Column(DateTime, nullable=True)
    asset_status_last_updated_by = Column(String, nullable=True)
    assignment_status = Column(String, nullable=True, default="Assigned")
    assignment_status_date = Column(String, nullable=True)
    assignment_status_last_updated_at = Column(DateTime, nullable=True)
    assignment_status_last_updated_by = Column(String, nullable=True)

    last_updated = Column(DateTime, default=datetime.datetime.utcnow)


class LoginOTP(Base):
    __tablename__ = "login_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    hashed_code = Column(String, nullable=False)
    asset_id = Column(Integer, nullable=False)
    purpose = Column(String, nullable=False, default="employee_login")
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    asset_id = Column(Integer, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class AssetStatusHistory(Base):
    __tablename__ = "asset_status_history"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, index=True, nullable=False)
    status = Column(String, nullable=False)
    effective_date = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class AssetAssignmentHistory(Base):
    __tablename__ = "asset_assignment_history"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, index=True, nullable=False)
    assignment_status = Column(String, nullable=False)
    effective_date = Column(String, nullable=True)
    employee_name = Column(String, nullable=True)
    employee_id = Column(String, nullable=True)
    email = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
