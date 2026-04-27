from sqlalchemy import text


def ensure_sqlite_columns(engine) -> None:
    if not str(engine.url).startswith("sqlite"):
        return

    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS assets (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS login_otps (id INTEGER PRIMARY KEY)"))

        cols = conn.execute(text("PRAGMA table_info(assets)"))
        existing = {row[1] for row in cols.fetchall()}
        admin_cols = conn.execute(text("PRAGMA table_info(admins)"))
        existing_admin = {row[1] for row in admin_cols.fetchall()}
        otp_cols = conn.execute(text("PRAGMA table_info(login_otps)"))
        existing_otp = {row[1] for row in otp_cols.fetchall()}

        desired_admin = {
            "username": "TEXT",
            "hashed_password": "TEXT",
            "role": "TEXT DEFAULT 'admin'",
        }
        desired_otp = {
            "email": "TEXT",
            "hashed_code": "TEXT",
            "asset_id": "INTEGER",
            "purpose": "TEXT DEFAULT 'employee_login'",
            "expires_at": "TEXT",
            "consumed_at": "TEXT",
            "created_at": "TEXT",
        }

        desired = {
            "employee_name": "TEXT",
            "employee_id": "TEXT",
            "email": "TEXT",
            "laptop_no": "TEXT",
            "charger_no": "TEXT",
            "mouse_no": "TEXT",
            "department": "TEXT",
            "location": "TEXT",
            "upload_token": "TEXT",
            "laptop_front_image": "TEXT",
            "laptop_rear_image": "TEXT",
            "mouse_image": "TEXT",
            "charger_image": "TEXT",
            "service_invoice_path": "TEXT",
            "hostname": "TEXT",
            "os_name": "TEXT",
            "brand": "TEXT",
            "model": "TEXT",
            "model_number": "TEXT",
            "serial_number": "TEXT",
            "cpu": "TEXT",
            "number_of_cpus": "TEXT",
            "cores_per_cpu": "TEXT",
            "logical_processors": "TEXT",
            "ram": "TEXT",
            "storage": "TEXT",
            "network_connection": "TEXT",
            "os_installation_date": "TEXT",
            "user_accounts": "TEXT",
            "service_status": "TEXT",
            "service_notes": "TEXT",
            "service_vendor": "TEXT",
            "service_handover_date": "TEXT",
            "service_return_date": "TEXT",
            "service_invoice_number": "TEXT",
            "service_invoice_amount": "TEXT",
            "service_last_updated_by": "TEXT",
            "last_updated": "TEXT",
        }

        for name, sql_type in desired_admin.items():
            if name not in existing_admin:
                conn.execute(text(f"ALTER TABLE admins ADD COLUMN {name} {sql_type}"))

        for name, sql_type in desired_otp.items():
            if name not in existing_otp:
                conn.execute(text(f"ALTER TABLE login_otps ADD COLUMN {name} {sql_type}"))

        for name, sql_type in desired.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE assets ADD COLUMN {name} {sql_type}"))
