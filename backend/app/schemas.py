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
    employee_username: Optional[str] = None
    laptop_username: Optional[str] = None
    laptop_password: Optional[str] = None
    laptop_no: Optional[str] = None
    charger_no: Optional[str] = None
    mouse_no: Optional[str] = None
    headset_no: Optional[str] = None
    other_devices: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None


class AssetManualCreate(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    employee_username: Optional[str] = None
    laptop_username: Optional[str] = None
    laptop_no: Optional[str] = None
    charger_no: Optional[str] = None
    mouse_no: Optional[str] = None
    headset_no: Optional[str] = None
    other_devices: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    hostname: Optional[str] = None
    os_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    model_number: Optional[str] = None
    cpu: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    serial_number: Optional[str] = None


class AssetServiceUpdate(BaseModel):
    service_status: Optional[str] = None
    service_notes: Optional[str] = None
    service_vendor: Optional[str] = None
    service_handover_date: Optional[str] = None
    service_return_date: Optional[str] = None
    service_invoice_number: Optional[str] = None
    service_invoice_amount: Optional[str] = None


class EmployeeAssetSelfUpdate(BaseModel):
    employee_name: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    other_devices: Optional[str] = None
    laptop_username: Optional[str] = None
    laptop_password: Optional[str] = None


class AssetOut(BaseModel):
    id: int
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    employee_username: Optional[str] = None
    laptop_username: Optional[str] = None
    laptop_no: Optional[str] = None
    charger_no: Optional[str] = None
    mouse_no: Optional[str] = None
    headset_no: Optional[str] = None
    other_devices: Optional[str] = None
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
    cpu: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    serial_number: Optional[str] = None
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
    asset_status: Optional[str] = None
    asset_status_date: Optional[str] = None
    asset_status_last_updated_at: Optional[datetime] = None
    asset_status_last_updated_by: Optional[str] = None
    assignment_status: Optional[str] = None
    assignment_status_date: Optional[str] = None
    assignment_status_last_updated_at: Optional[datetime] = None
    assignment_status_last_updated_by: Optional[str] = None

    last_updated: datetime

    class Config:
        from_attributes = True


class AssetCredentialsUpdate(BaseModel):
    employee_username: Optional[str] = None
    password: Optional[str] = None


class AssetCredentialsOut(BaseModel):
    id: int
    employee_username: Optional[str] = None
    email: Optional[str] = None
    password_configured: bool


class UploadTokenOut(BaseModel):
    upload_token: str


class PublicUploadInfoOut(BaseModel):
    id: int
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    hostname: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
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
    asset_id: Optional[int] = None


class SessionUserOut(BaseModel):
    username: str
    role: str
    email: Optional[str] = None
    name: Optional[str] = None
    asset_id: Optional[int] = None


class OTPRequest(BaseModel):
    email: str


class OTPRequestOut(BaseModel):
    message: str
    expires_in_seconds: int


class OTPVerify(BaseModel):
    email: str
    otp: str


class EmployeeLogin(BaseModel):
    login: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class MessageOut(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class EmployeePasswordChange(BaseModel):
    login: str
    old_password: str
    new_password: str


class AssetTrackingUpdate(BaseModel):
    asset_status: str
    asset_status_date: Optional[str] = None
    assignment_status: str
    assignment_status_date: Optional[str] = None


class AssetComponentBase(BaseModel):
    component_type: str
    identifier: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class AssetComponentCreate(AssetComponentBase):
    pass


class AssetComponentUpdate(BaseModel):
    component_type: Optional[str] = None
    identifier: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class AssetComponentOut(AssetComponentBase):
    id: int
    asset_id: int

    class Config:
        from_attributes = True


class AssetStatusHistoryOut(BaseModel):
    id: int
    asset_id: int
    status: str
    effective_date: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AssetAssignmentHistoryOut(BaseModel):
    id: int
    asset_id: int
    assignment_status: str
    effective_date: Optional[str] = None
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AssetTrackingOut(BaseModel):
    asset: AssetOut
    status_history: list[AssetStatusHistoryOut]
    assignment_history: list[AssetAssignmentHistoryOut]
