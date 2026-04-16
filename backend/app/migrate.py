from sqlalchemy import text


def ensure_sqlite_columns(engine) -> None:
    if not str(engine.url).startswith("sqlite"):
        return

    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS assets (id INTEGER PRIMARY KEY)"))

        cols = conn.execute(text("PRAGMA table_info(assets)"))
        existing = {row[1] for row in cols.fetchall()}

        desired = {
            "employee_name": "TEXT",
            "employee_id": "TEXT",
            "email": "TEXT",
            "laptop_no": "TEXT",
            "charger_no": "TEXT",
            "mouse_no": "TEXT",
            "hostname": "TEXT",
            "os_name": "TEXT",
            "brand": "TEXT",
            "model": "TEXT",
            "serial_number": "TEXT",
            "cpu": "TEXT",
            "ram": "TEXT",
            "storage": "TEXT",
            "last_updated": "TEXT",
        }

        for name, sql_type in desired.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE assets ADD COLUMN {name} {sql_type}"))
