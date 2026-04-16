from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# Agent payload (employee fields optional; admin can fill later)
class AssetCreate(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None

    hostname: str
    os_name: str
    brand: str
    model: str
    serial_number: str
    cpu: str
    ram: str
    storage: str


# Admin updates (assignment + accessories)
class AssetAssignmentUpdate(BaseModel):
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    laptop_no: Optional[str] = None
    charger_no: Optional[str] = None
    mouse_no: Optional[str] = None


class AssetOut(BaseModel):
    id: int
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    laptop_no: Optional[str] = None
    charger_no: Optional[str] = None
    mouse_no: Optional[str] = None

    hostname: Optional[str] = None
    os_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    cpu: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None

    last_updated: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
