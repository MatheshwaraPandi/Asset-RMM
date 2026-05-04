import argparse
import ctypes
import datetime
import getpass
import json
import os
import platform
import socket
import subprocess
import sys
import time
import tkinter as tk
from tkinter import messagebox, ttk

import psutil
import requests
import wmi

DEFAULT_RETRY_SECONDS = int(os.getenv("RMM_AGENT_RETRY_SECONDS", "30"))
DEFAULT_MAX_RETRIES = int(os.getenv("RMM_AGENT_MAX_RETRIES", "5"))
LOG_FILE = os.path.join(os.getenv("TEMP", os.getcwd()), "asset_agent.log")
DEFAULT_EMBEDDED_SERVER_URL = os.getenv("RMM_AGENT_FALLBACK_URL", "http://192.168.1.3:8000").rstrip("/")
CREATE_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0


def _load_runtime_env_file() -> dict[str, str]:
    candidates: list[str] = []
    if getattr(sys, "frozen", False):
        base_dir = os.path.dirname(sys.executable)
        candidates.extend(
            [
                os.path.join(base_dir, "agent.env"),
                os.path.join(base_dir, ".env"),
            ]
        )
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        candidates.append(os.path.join(base_dir, ".env"))

    for path in candidates:
        try:
            with open(path, "r", encoding="utf-8") as handle:
                loaded: dict[str, str] = {}
                for raw_line in handle:
                    line = raw_line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, value = line.split("=", 1)
                    loaded[key.strip()] = value.strip().strip("\"'")
                if loaded:
                    return loaded
        except FileNotFoundError:
            continue
        except Exception as exc:
            log_agent_message(f"Failed to read env file {path}: {exc}")
    return {}


def _get_default_server_url() -> str:
    runtime_env = _load_runtime_env_file()
    return (
        runtime_env.get("RMM_API_URL")
        or runtime_env.get("BACKEND_API_URL")
        or runtime_env.get("NEXT_PUBLIC_BACKEND_API_URL")
        or os.getenv("RMM_API_URL")
        or os.getenv("BACKEND_API_URL")
        or os.getenv("NEXT_PUBLIC_BACKEND_API_URL")
        or DEFAULT_EMBEDDED_SERVER_URL
    ).rstrip("/")


DEFAULT_SERVER_URL = _get_default_server_url()


def hide_console_window() -> None:
    if sys.platform != "win32":
        return

    try:
        kernel32 = ctypes.windll.kernel32
        user32 = ctypes.windll.user32
        window_handle = kernel32.GetConsoleWindow()
        if window_handle:
            user32.ShowWindow(window_handle, 0)
    except Exception:
        pass


def log_agent_message(message: str) -> None:
    try:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a", encoding="utf-8") as log_file:
            log_file.write(f"[{timestamp}] {message}\n")
    except Exception:
        pass


def clean(value: object, default: str = "UNKNOWN") -> str:
    text = str(value or "").strip()
    if not text:
        return default
    if text.lower() in {"none", "unknown", "to be filled by o.e.m.", "system serial number"}:
        return default
    return text


def format_gb(total_bytes: int | float | None) -> str:
    if not total_bytes:
        return "UNKNOWN"
    return f"{(float(total_bytes) / (1024 ** 3)):.2f} GB"


def parse_wmi_datetime(value: str | None) -> str:
    if not value:
        return "UNKNOWN"
    try:
        parsed = datetime.datetime.strptime(str(value)[:14], "%Y%m%d%H%M%S")
        return parsed.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return clean(value)


def get_primary_ip() -> str | None:
    for _, addresses in psutil.net_if_addrs().items():
        for address in addresses:
            if (
                address.family == socket.AF_INET
                and address.address != "127.0.0.1"
                and not str(address.address).startswith("169.254.")
            ):
                return address.address
    return None


def run_powershell_json(command: str):
    try:
        startupinfo = None
        if sys.platform == "win32":
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 0

        completed = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
            check=True,
            capture_output=True,
            text=True,
            timeout=20,
            creationflags=CREATE_NO_WINDOW,
            startupinfo=startupinfo,
        )
        output = completed.stdout.strip()
        if not output:
            return None
        return json.loads(output)
    except Exception as exc:
        log_agent_message(f"PowerShell fallback failed: {exc}")
        return None


def get_windows_fallback_snapshot() -> dict[str, object]:
    snapshot = {
        "system": None,
        "os": None,
        "processors": [],
        "product": None,
        "bios": None,
    }

    mapping = {
        "system": "Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer,Model,SystemFamily | ConvertTo-Json -Compress",
        "os": "Get-CimInstance Win32_OperatingSystem | Select-Object Caption,InstallDate | ConvertTo-Json -Compress",
        "processors": "Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors | ConvertTo-Json -Compress",
        "product": "Get-CimInstance Win32_ComputerSystemProduct | Select-Object Name,Version,IdentifyingNumber | ConvertTo-Json -Compress",
        "bios": "Get-CimInstance Win32_BIOS | Select-Object SerialNumber | ConvertTo-Json -Compress",
    }

    for key, command in mapping.items():
        value = run_powershell_json(command)
        if value is None:
            continue
        if key == "processors" and isinstance(value, dict):
            snapshot[key] = [value]
        else:
            snapshot[key] = value
    return snapshot


def get_storage_size(client: wmi.WMI) -> str:
    try:
        fixed_disks = client.Win32_LogicalDisk(DriveType=3)
        total = sum(int(disk.Size or 0) for disk in fixed_disks)
        return format_gb(total)
    except Exception:
        try:
            return format_gb(psutil.disk_usage("C:\\").total)
        except Exception:
            return "UNKNOWN"


def get_network_connection(client: wmi.WMI) -> str:
    connections: list[str] = []

    try:
        adapters = client.Win32_NetworkAdapter(NetEnabled=True)
        for adapter in adapters:
            raw_name = getattr(adapter, "NetConnectionID", None) or getattr(adapter, "Name", None)
            name = clean(raw_name, default="")
            if not name:
                continue

            lower_name = name.lower()
            if any(token in lower_name for token in ("bluetooth", "virtual", "vmware", "hyper-v", "loopback")):
                continue

            if "wi-fi" in lower_name or "wireless" in lower_name or "wlan" in lower_name:
                connections.append("Wi-Fi")
            elif "ethernet" in lower_name or "lan" in lower_name:
                connections.append("Ethernet")
            else:
                connections.append(name)
    except Exception:
        pass

    unique: list[str] = []
    for connection in connections:
        if connection not in unique:
            unique.append(connection)

    return ", ".join(unique) if unique else "UNKNOWN"


def get_user_accounts(client: wmi.WMI) -> str:
    try:
        accounts = []
        for account in client.Win32_UserAccount(LocalAccount=True):
            name = clean(getattr(account, "Name", None), default="")
            if name and name not in accounts:
                accounts.append(name)
        return ", ".join(sorted(accounts)) if accounts else "UNKNOWN"
    except Exception:
        return "UNKNOWN"


def get_user_accounts_fallback() -> str:
    try:
        users = run_powershell_json(
            "Get-LocalUser | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress"
        )
        if isinstance(users, str):
            return users
        if isinstance(users, list) and users:
            return ", ".join(sorted(str(user) for user in users if user))
    except Exception:
        pass
    return clean(getpass.getuser())


class EmployeeDetailsDialog:
    def __init__(self) -> None:
        self.result = {
            "employee_name": clean(getpass.getuser(), default=""),
            "employee_id": "",
        }

    def show(self) -> dict[str, str]:
        root = tk.Tk()
        root.configure(bg="#0f172a")
        root.title("Asset Registration")
        root.resizable(False, False)
        root.attributes("-topmost", True)
        root.lift()
        root.focus_force()
        dialog = root
        dialog.title("Asset Registration")
        dialog.configure(bg="#0f172a")
        dialog.protocol("WM_DELETE_WINDOW", self.on_skip)

        frame = tk.Frame(
            dialog,
            bg="#0f172a",
            padx=24,
            pady=22,
            highlightbackground="#334155",
            highlightthickness=1,
        )
        frame.pack(fill="both", expand=True)

        title = tk.Label(
            frame,
            text="Register this laptop",
            bg="#0f172a",
            fg="#f8fafc",
            font=("Segoe UI", 16, "bold"),
        )
        title.pack(anchor="w")

        subtitle = tk.Label(
            frame,
            text="Enter the employee details before the agent uploads the system information.",
            bg="#0f172a",
            fg="#cbd5e1",
            wraplength=360,
            justify="left",
            font=("Segoe UI", 10),
        )
        subtitle.pack(anchor="w", pady=(6, 18))

        style = ttk.Style(dialog)
        style.theme_use("clam")
        style.configure(
            "Asset.TLabel",
            font=("Segoe UI", 10, "bold"),
            background="#0f172a",
            foreground="#e2e8f0",
        )
        style.configure(
            "Asset.TEntry",
            fieldbackground="#111827",
            foreground="#f8fafc",
            bordercolor="#475569",
            lightcolor="#475569",
            darkcolor="#475569",
            padding=8,
        )
        style.map("Asset.TEntry", bordercolor=[("focus", "#38bdf8")])

        self.name_var = tk.StringVar(value=self.result["employee_name"])
        self.id_var = tk.StringVar(value=self.result["employee_id"])

        ttk.Label(frame, text="Employee Name", style="Asset.TLabel").pack(anchor="w")
        self.name_entry = ttk.Entry(frame, textvariable=self.name_var, width=42, style="Asset.TEntry")
        self.name_entry.pack(fill="x", pady=(6, 14))

        ttk.Label(frame, text="Employee ID", style="Asset.TLabel").pack(anchor="w")
        self.id_entry = ttk.Entry(frame, textvariable=self.id_var, width=42, style="Asset.TEntry")
        self.id_entry.pack(fill="x", pady=(6, 8))

        note = tk.Label(
            frame,
            text="Tip: employee ID helps the admin panel match repeat scans to the same person.",
            bg="#0f172a",
            fg="#94a3b8",
            wraplength=360,
            justify="left",
            font=("Segoe UI", 9),
        )
        note.pack(anchor="w", pady=(0, 18))

        buttons = tk.Frame(frame, bg="#0f172a")
        buttons.pack(fill="x")

        skip_button = tk.Button(
            buttons,
            text="Skip for now",
            command=self.on_skip,
            bg="#1e293b",
            fg="#e2e8f0",
            activebackground="#334155",
            activeforeground="#ffffff",
            relief="flat",
            padx=14,
            pady=8,
            font=("Segoe UI", 9, "bold"),
        )
        skip_button.pack(side="left")

        continue_button = tk.Button(
            buttons,
            text="Continue",
            command=self.on_submit,
            bg="#0284c7",
            fg="#ffffff",
            activebackground="#0369a1",
            activeforeground="#ffffff",
            relief="flat",
            padx=18,
            pady=8,
            font=("Segoe UI", 9, "bold"),
        )
        continue_button.pack(side="right")

        self.dialog = dialog
        dialog.update_idletasks()
        width = dialog.winfo_reqwidth()
        height = dialog.winfo_reqheight()
        x = (dialog.winfo_screenwidth() - width) // 2
        y = (dialog.winfo_screenheight() - height) // 3
        dialog.geometry(f"{width}x{height}+{x}+{y}")
        dialog.deiconify()
        dialog.grab_set()
        self.name_entry.focus_set()
        dialog.mainloop()
        return self.result

    def on_submit(self) -> None:
        employee_name = self.name_var.get().strip()
        employee_id = self.id_var.get().strip()

        if not employee_name:
            messagebox.showerror("Employee Name Required", "Please enter the employee name.", parent=self.dialog)
            self.name_entry.focus_set()
            return

        if not employee_id:
            messagebox.showerror("Employee ID Required", "Please enter the employee ID.", parent=self.dialog)
            self.id_entry.focus_set()
            return

        self.result = {
            "employee_name": employee_name,
            "employee_id": employee_id,
        }
        self.dialog.quit()
        self.dialog.destroy()

    def on_skip(self) -> None:
        self.result = {
            "employee_name": self.name_var.get().strip(),
            "employee_id": self.id_var.get().strip(),
        }
        self.dialog.quit()
        self.dialog.destroy()


def prompt_employee_details() -> dict[str, str]:
    try:
        log_agent_message("Opening employee details dialog.")
        return EmployeeDetailsDialog().show()
    except Exception as exc:
        log_agent_message(f"Employee dialog failed: {exc}")
        return {
            "employee_name": clean(getpass.getuser(), default=""),
            "employee_id": "",
        }


def get_system_specs() -> dict:
    employee_details = prompt_employee_details()
    client = None
    system = None
    os_info = None
    processors = []
    products = []
    bios_entries = []

    try:
        client = wmi.WMI()
        systems = client.Win32_ComputerSystem()
        operating_systems = client.Win32_OperatingSystem()
        processors = client.Win32_Processor()
        products = client.Win32_ComputerSystemProduct()
        bios_entries = client.Win32_BIOS()
        system = systems[0] if systems else None
        os_info = operating_systems[0] if operating_systems else None
    except Exception as exc:
        log_agent_message(f"WMI collection failed, switching to PowerShell fallback: {exc}")

    fallback = get_windows_fallback_snapshot()
    fallback_system = fallback.get("system") if isinstance(fallback.get("system"), dict) else {}
    fallback_os = fallback.get("os") if isinstance(fallback.get("os"), dict) else {}
    fallback_product = fallback.get("product") if isinstance(fallback.get("product"), dict) else {}
    fallback_bios = fallback.get("bios") if isinstance(fallback.get("bios"), dict) else {}
    fallback_processors = fallback.get("processors") if isinstance(fallback.get("processors"), list) else []

    product = products[0] if products else fallback_product
    bios = bios_entries[0] if bios_entries else fallback_bios
    primary_processor = processors[0] if processors else (fallback_processors[0] if fallback_processors else None)

    cpu_name = clean(getattr(primary_processor, "Name", None) if processors else primary_processor.get("Name"))
    cpu_count = len(processors) if processors else len(fallback_processors)
    cores_per_cpu = clean(
        getattr(primary_processor, "NumberOfCores", None) if processors else primary_processor.get("NumberOfCores")
    )
    logical_processors = (
        sum(int(getattr(proc, "NumberOfLogicalProcessors", 0) or 0) for proc in processors)
        if processors
        else sum(int((proc or {}).get("NumberOfLogicalProcessors") or 0) for proc in fallback_processors)
    )

    serial_number = clean(
        (getattr(product, "IdentifyingNumber", None) if products else product.get("IdentifyingNumber"))
        or (getattr(bios, "SerialNumber", None) if bios_entries else bios.get("SerialNumber"))
    )
    model_number = clean(
        (getattr(product, "Version", None) if products else product.get("Version"))
        or (getattr(product, "Name", None) if products else product.get("Name"))
        or (getattr(system, "SystemFamily", None) if system else fallback_system.get("SystemFamily"))
    )

    return {
        "employee_name": employee_details.get("employee_name") or None,
        "employee_id": employee_details.get("employee_id") or None,
        "hostname": clean(platform.node()),
        "os_name": clean(getattr(os_info, "Caption", None) if os_info else fallback_os.get("Caption")),
        "brand": clean(getattr(system, "Manufacturer", None) if system else fallback_system.get("Manufacturer")),
        "model": clean(getattr(system, "Model", None) if system else fallback_system.get("Model")),
        "model_number": model_number,
        "serial_number": serial_number,
        "cpu": cpu_name,
        "number_of_cpus": str(cpu_count) if cpu_count else "UNKNOWN",
        "cores_per_cpu": cores_per_cpu,
        "logical_processors": str(logical_processors) if logical_processors else "UNKNOWN",
        "ram": format_gb(psutil.virtual_memory().total),
        "storage": get_storage_size(client) if client else format_gb(psutil.disk_usage("C:\\").total),
        "network_connection": get_network_connection(client) if client else clean("Wi-Fi" if get_primary_ip() else "UNKNOWN"),
        "os_installation_date": parse_wmi_datetime(getattr(os_info, "InstallDate", None) if os_info else fallback_os.get("InstallDate")),
        "user_accounts": get_user_accounts(client) if client else get_user_accounts_fallback(),
        "ip": get_primary_ip(),
        "collected_at": datetime.datetime.utcnow().isoformat(),
    }


def post_specs(server_url: str, payload: dict | None = None) -> None:
    payload = payload or get_system_specs()
    log_agent_message(
        "Uploading asset info for "
        f"employee={payload.get('employee_name') or 'UNKNOWN'} "
        f"serial={payload.get('serial_number') or 'UNKNOWN'} "
        f"host={payload.get('hostname') or 'UNKNOWN'}"
    )
    response = requests.post(
        f"{server_url}/register-asset",
        json=payload,
        timeout=20,
    )
    log_agent_message(f"Upload response: status={response.status_code}")
    try:
        log_agent_message(f"Upload response body: {response.text[:1000]}")
    except Exception:
        pass
    response.raise_for_status()


def validate_server_url(server_url: str) -> str:
    normalized = str(server_url or "").strip().rstrip("/")
    if not normalized:
        raise ValueError(
            "Backend URL is not configured. Create an agent.env file next to the EXE with "
            "RMM_API_URL=https://your-backend-host"
        )
    if not normalized.startswith(("http://", "https://")):
        raise ValueError("Backend URL must start with http:// or https://")
    return normalized


def format_runtime_error(exc: Exception, server_url: str) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    lowered = message.lower()

    if "failed to establish a new connection" in lowered or "actively refused it" in lowered:
        return (
            "The agent could not connect to the backend server.\n\n"
            f"Configured server: {server_url}\n\n"
            "Check that the backend is running, the server IP/domain is correct in agent.env, "
            "and port 8000 is reachable from this laptop."
        )

    if "timed out" in lowered:
        return (
            "The backend server did not respond in time.\n\n"
            f"Configured server: {server_url}\n\n"
            "Check network access, firewall rules, and whether this laptop can reach that server address."
        )

    if "404" in lowered:
        return (
            "The backend URL is reachable but the registration endpoint was not found.\n\n"
            f"Configured server: {server_url}\n\n"
            "Check that agent.env points to the API base URL, for example http://server:8000."
        )

    return (
        "Asset upload failed.\n\n"
        f"Configured server: {server_url}\n\n"
        f"Details: {message}"
    )


def show_completion_message(title: str, message: str) -> None:
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        messagebox.showinfo(title, message, parent=root)
        root.destroy()
    except Exception as exc:
        log_agent_message(f"Completion message failed: {exc}")


def run(server_url: str, retry_seconds: int, max_retries: int, hide_console: bool) -> None:
    try:
        server_url = validate_server_url(server_url)
    except Exception as exc:
        log_agent_message(f"Server URL validation failed: {exc}")
        show_completion_message(
            "Asset Registration",
            "Agent configuration is missing or invalid. Place an agent.env file next to the EXE with "
            "RMM_API_URL=http://your-server:8000 and try again.",
        )
        return

    try:
        payload = get_system_specs()
    except Exception as exc:
        log_agent_message(f"System collection failed: {exc}")
        show_completion_message(
            "Asset Registration",
            "The agent could not collect system information. Please contact IT and share the asset_agent.log file from your Temp folder.",
        )
        return

    for attempt in range(max_retries):
        try:
            if hide_console:
                hide_console_window()
            post_specs(server_url, payload=payload)
            show_completion_message(
                "Asset Registration",
                "System information uploaded successfully.",
            )
            return
        except Exception as exc:
            log_agent_message(f"Attempt {attempt + 1} failed: {exc}")
            if attempt == max_retries - 1:
                show_completion_message(
                    "Asset Registration",
                    f"{format_runtime_error(exc, server_url)}\n\n"
                    "Please contact IT and share the asset_agent.log file from your Temp folder if this continues.",
                )
                return
            time.sleep(retry_seconds)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="AssetScanner_v2")
    parser.add_argument(
        "--server",
        default=DEFAULT_SERVER_URL,
        help="Backend base URL, e.g. http://127.0.0.1:8000",
    )
    parser.add_argument("--retry-seconds", type=int, default=DEFAULT_RETRY_SECONDS)
    parser.add_argument("--max-retries", type=int, default=DEFAULT_MAX_RETRIES)
    parser.add_argument("--no-hide-console", action="store_true")
    return parser.parse_args(argv)


if __name__ == "__main__":
    args = parse_args(sys.argv[1:])
    run(
        server_url=str(args.server).rstrip("/"),
        retry_seconds=int(args.retry_seconds),
        max_retries=int(args.max_retries),
        hide_console=not bool(args.no_hide_console),
    )
