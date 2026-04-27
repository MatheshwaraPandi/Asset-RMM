from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AssetCreate(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None

    hostname: str
    os_name: str
    brand: str
    model: str
    model_number: Optional[str] = None
    serial_number: str
    cpu: str
    ram: str
    storage: str
    number_of_cpus: Optional[str] = None
    cores_per_cpu: Optional[str] = None
    logical_processors: Optional[str] = None
    network_connection: Optional[str] = None
    os_installation_date: Optional[str] = None
    user_accounts: Optional[str] = None


class AssetAssignmentUpdate(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    laptop_no: Optional[str] = None
    charger_no: Optional[str] = None
    mouse_no: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None


class AssetManualCreate(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    laptop_no: Optional[str] = None
    charger_no: Optional[str] = None
    mouse_no: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    hostname: Optional[str] = None
    os_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None


class AssetServiceUpdate(BaseModel):
    service_status: Optional[str] = None
    service_notes: Optional[str] = None
    service_vendor: Optional[str] = None
    service_handover_date: Optional[str] = None
    service_return_date: Optional[str] = None
    service_invoice_number: Optional[str] = None
    service_invoice_amount: Optional[str] = None


class AssetOut(BaseModel):
    id: int
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    laptop_no: Optional[str] = None
    charger_no: Optional[str] = None
    mouse_no: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None

    upload_token: Optional[str] = None

    laptop_front_image: Optional[str] = None
    laptop_rear_image: Optional[str] = None
    mouse_image: Optional[str] = None
    charger_image: Optional[str] = None
    service_invoice_path: Optional[str] = None

    hostname: Optional[str] = None
    os_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    cpu: Optional[str] = None
    number_of_cpus: Optional[str] = None
    cores_per_cpu: Optional[str] = None
    logical_processors: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    network_connection: Optional[str] = None
    os_installation_date: Optional[str] = None
    user_accounts: Optional[str] = None

    service_status: Optional[str] = None
    service_notes: Optional[str] = None
    service_vendor: Optional[str] = None
    service_handover_date: Optional[str] = None
    service_return_date: Optional[str] = None
    service_invoice_number: Optional[str] = None
    service_invoice_amount: Optional[str] = None
    service_last_updated_by: Optional[str] = None

    last_updated: datetime

    class Config:
        from_attributes = True


class UploadTokenOut(BaseModel):
    upload_token: str


class PublicUploadInfoOut(BaseModel):
    id: int
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    serial_number: Optional[str] = None

    laptop_front_image: Optional[str] = None
    laptop_rear_image: Optional[str] = None
    mouse_image: Optional[str] = None
    charger_image: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: Optional[str] = None
    email: Optional[str] = None


class SessionUserOut(BaseModel):
    username: str
    role: str
    email: Optional[str] = None
    name: Optional[str] = None


class OTPRequest(BaseModel):
    email: str


class OTPRequestOut(BaseModel):
    message: str
    expires_in_seconds: int


class OTPVerify(BaseModel):
    email: str
    otp: str
