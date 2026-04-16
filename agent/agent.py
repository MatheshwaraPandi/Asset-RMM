import wmi
import psutil
import platform
import requests
import tkinter as tk
from tkinter import simpledialog, messagebox

def collect_and_send():
    try:
        c = wmi.WMI()
        sys = c.Win32_ComputerSystem()[0]
        os = c.Win32_OperatingSystem()[0]
        proc = c.Win32_Processor()[0]
        
        # 1. UI for Employee Details
        root = tk.Tk()
        root.withdraw()  # Hide main window
        root.attributes("-topmost", True)
        
        emp_name = simpledialog.askstring("RMM Agent", "Enter your Full Name:", parent=root)
        emp_id = simpledialog.askstring("RMM Agent", "Enter your Employee ID:", parent=root)

        if not emp_name or not emp_id:
            messagebox.showwarning("Warning", "Employee details are required.")
            return

        # 2. Gather Hardware Specs
        data = {
            "employee_name": emp_name,
            "employee_id": emp_id,
            "hostname": platform.node(),
            "os_name": os.Caption,
            "brand": sys.Manufacturer,
            "model": sys.Model,
            "serial_number": c.Win32_Bios()[0].SerialNumber,
            "cpu": proc.Name,
            "ram": f"{round(psutil.virtual_memory().total / (1024**3), 2)} GB",
            "storage": f"{round(psutil.disk_usage('/').total / (1024**3), 2)} GB"
        }

        # 3. Send to FastAPI Backend
        # Replace 'localhost' with your server's actual IP address
        response = requests.post("http://192.168.0.21:8000/register-asset", json=data)
        
        if response.status_code == 201:
            messagebox.showinfo("Success", "System info synced successfully!")
        else:
            messagebox.showerror("Error", f"Server returned error: {response.status_code}")

    except Exception as e:
        messagebox.showerror("Agent Error", f"Failed to collect data: {str(e)}")

if __name__ == "__main__":
    collect_and_send()