from sqlalchemy import text


def ensure_sqlite_columns(engine) -> None:
    if not str(engine.url).startswith("sqlite"):
        return

    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS assets (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS login_otps (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS password_reset_tokens (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS asset_status_history (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS asset_assignment_history (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS asset_components (id INTEGER PRIMARY KEY)"))

        cols = conn.execute(text("PRAGMA table_info(assets)"))
        existing = {row[1] for row in cols.fetchall()}
        admin_cols = conn.execute(text("PRAGMA table_info(admins)"))
        existing_admin = {row[1] for row in admin_cols.fetchall()}
        otp_cols = conn.execute(text("PRAGMA table_info(login_otps)"))
        existing_otp = {row[1] for row in otp_cols.fetchall()}
        reset_cols = conn.execute(text("PRAGMA table_info(password_reset_tokens)"))
        existing_reset = {row[1] for row in reset_cols.fetchall()}
        status_history_cols = conn.execute(text("PRAGMA table_info(asset_status_history)"))
        existing_status_history = {row[1] for row in status_history_cols.fetchall()}
        assignment_history_cols = conn.execute(text("PRAGMA table_info(asset_assignment_history)"))
        existing_assignment_history = {row[1] for row in assignment_history_cols.fetchall()}
        asset_components_cols = conn.execute(text("PRAGMA table_info(asset_components)"))
        existing_asset_components = {row[1] for row in asset_components_cols.fetchall()}

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
        desired_reset = {
            "email": "TEXT",
            "token": "TEXT",
            "asset_id": "INTEGER",
            "expires_at": "TEXT",
            "consumed_at": "TEXT",
            "created_at": "TEXT",
        }
        desired_status_history = {
            "asset_id": "INTEGER",
            "status": "TEXT",
            "effective_date": "TEXT",
            "updated_by": "TEXT",
            "created_at": "TEXT",
        }
        desired_assignment_history = {
            "asset_id": "INTEGER",
            "assignment_status": "TEXT",
            "effective_date": "TEXT",
            "employee_name": "TEXT",
            "employee_id": "TEXT",
            "email": "TEXT",
            "updated_by": "TEXT",
            "created_at": "TEXT",
        }

        desired_asset_components = {
            "asset_id": "INTEGER",
            "component_type": "TEXT",
            "identifier": "TEXT",
            "brand": "TEXT",
            "model": "TEXT",
            "color": "TEXT",
            "status": "TEXT",
            "assigned_to": "TEXT",
            "location": "TEXT",
            "notes": "TEXT",
            "last_updated": "TEXT",
        }

        desired = {
            "employee_name": "TEXT",
            "employee_id": "TEXT",
            "email": "TEXT",
            "employee_username": "TEXT",
            "employee_password_hash": "TEXT",
            "laptop_username": "TEXT",
            "laptop_password_hash": "TEXT",
            "laptop_no": "TEXT",
            "charger_no": "TEXT",
            "mouse_no": "TEXT",
            "headset_no": "TEXT",
            "other_devices": "TEXT",
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
            "asset_status": "TEXT",
            "asset_status_date": "TEXT",
            "asset_status_last_updated_at": "TEXT",
            "asset_status_last_updated_by": "TEXT",
            "assignment_status": "TEXT",
            "assignment_status_date": "TEXT",
            "assignment_status_last_updated_at": "TEXT",
            "assignment_status_last_updated_by": "TEXT",
            "is_active": "INTEGER DEFAULT 1",
            "last_updated": "TEXT",
        }

        for name, sql_type in desired_admin.items():
            if name not in existing_admin:
                conn.execute(text(f"ALTER TABLE admins ADD COLUMN {name} {sql_type}"))

        for name, sql_type in desired_otp.items():
            if name not in existing_otp:
                conn.execute(text(f"ALTER TABLE login_otps ADD COLUMN {name} {sql_type}"))

        for name, sql_type in desired_reset.items():
            if name not in existing_reset:
                conn.execute(text(f"ALTER TABLE password_reset_tokens ADD COLUMN {name} {sql_type}"))

        for name, sql_type in desired_status_history.items():
            if name not in existing_status_history:
                conn.execute(text(f"ALTER TABLE asset_status_history ADD COLUMN {name} {sql_type}"))

        for name, sql_type in desired_assignment_history.items():
            if name not in existing_assignment_history:
                conn.execute(text(f"ALTER TABLE asset_assignment_history ADD COLUMN {name} {sql_type}"))

        for name, sql_type in desired_asset_components.items():
            if name not in existing_asset_components:
                conn.execute(text(f"ALTER TABLE asset_components ADD COLUMN {name} {sql_type}"))

        for name, sql_type in desired.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE assets ADD COLUMN {name} {sql_type}"))
