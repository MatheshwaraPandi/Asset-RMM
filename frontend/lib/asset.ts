export type Asset = {
  id: number;

  employee_name?: string | null;
  employee_id?: string | null;
  email?: string | null;
  employee_username?: string | null;
  laptop_username?: string | null;
  laptop_no?: string | null;
  charger_no?: string | null;
  mouse_no?: string | null;
  headset_no?: string | null;
  other_devices?: string | null;
  department?: string | null;
  location?: string | null;

  upload_token?: string | null;

  laptop_front_image?: string | null;
  laptop_rear_image?: string | null;
  mouse_image?: string | null;
  charger_image?: string | null;
  service_invoice_path?: string | null;

  hostname?: string | null;
  os_name?: string | null;
  brand?: string | null;
  model?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  cpu?: string | null;
  number_of_cpus?: string | null;
  cores_per_cpu?: string | null;
  logical_processors?: string | null;
  ram?: string | null;
  storage?: string | null;
  network_connection?: string | null;
  os_installation_date?: string | null;
  user_accounts?: string | null;

  service_status?: string | null;
  service_notes?: string | null;
  service_vendor?: string | null;
  service_handover_date?: string | null;
  service_return_date?: string | null;
  service_invoice_number?: string | null;
  service_invoice_amount?: string | null;
  service_last_updated_by?: string | null;
  asset_status?: string | null;
  asset_status_date?: string | null;
  asset_status_last_updated_at?: string | null;
  asset_status_last_updated_by?: string | null;
  is_active?: boolean;
  assignment_status?: string | null;
  assignment_status_date?: string | null;
  assignment_status_last_updated_at?: string | null;
  assignment_status_last_updated_by?: string | null;
  last_updated?: string | null;
};

export type AssetStatusHistory = {
  id: number;
  asset_id: number;
  status: string;
  effective_date?: string | null;
  updated_by?: string | null;
  created_at: string;
};

export type AssetAssignmentHistory = {
  id: number;
  asset_id: number;
  assignment_status: string;
  effective_date?: string | null;
  employee_name?: string | null;
  employee_id?: string | null;
  email?: string | null;
  updated_by?: string | null;
  created_at: string;
};

export type AssetComponent = {
  id: number;
  asset_id: number;
  component_type: string;
  identifier?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  location?: string | null;
  notes?: string | null;
};

export type AssetTracking = {
  asset: Asset;
  status_history: AssetStatusHistory[];
  assignment_history: AssetAssignmentHistory[];
};

export type AssignmentForm = {
  employee_name: string;
  employee_id: string;
  email: string;
  laptop_username: string;
  laptop_no: string;
  charger_no: string;
  mouse_no: string;
  headset_no: string;
  other_devices: string;
  department: string;
  location: string;
  laptop_password: string;
};

export type ServiceForm = {
  service_status: string;
  service_notes: string;
  service_vendor: string;
  service_handover_date: string;
  service_return_date: string;
  service_invoice_number: string;
  service_invoice_amount: string;
};

export const emptyForm: AssignmentForm = {
  employee_name: "",
  employee_id: "",
  email: "",
  laptop_username: "",
  laptop_no: "",
  charger_no: "",
  mouse_no: "",
  headset_no: "",
  other_devices: "",
  department: "",
  location: "",
  laptop_password: "",
};

export const emptyServiceForm: ServiceForm = {
  service_status: "In Use",
  service_notes: "",
  service_vendor: "",
  service_handover_date: "",
  service_return_date: "",
  service_invoice_number: "",
  service_invoice_amount: "",
};

export function getAssignmentForm(asset: Asset): AssignmentForm {
  return {
    employee_name: asset.employee_name ?? "",
    employee_id: asset.employee_id ?? "",
    email: asset.email ?? "",
    laptop_username: asset.laptop_username ?? "",
    laptop_no: asset.laptop_no ?? "",
    charger_no: asset.charger_no ?? "",
    mouse_no: asset.mouse_no ?? "",
    headset_no: asset.headset_no ?? "",
    other_devices: asset.other_devices ?? "",
    department: asset.department ?? "",
    location: asset.location ?? "",
    laptop_password: "",
  };
}

export function getServiceForm(asset: Asset): ServiceForm {
  return {
    service_status: asset.service_status ?? "In Use",
    service_notes: asset.service_notes ?? "",
    service_vendor: asset.service_vendor ?? "",
    service_handover_date: asset.service_handover_date ?? "",
    service_return_date: asset.service_return_date ?? "",
    service_invoice_number: asset.service_invoice_number ?? "",
    service_invoice_amount: asset.service_invoice_amount ?? "",
  };
}

export function formatValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return value;
}

export function getAssetDisplayName(asset: Partial<Asset>) {
  return (
    asset.employee_name ||
    asset.email ||
    asset.hostname ||
    asset.serial_number ||
    (asset.id ? `Employee Asset #${asset.id}` : "Unassigned Employee")
  );
}

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}

export function getAssetPublicUrl(assetId: number) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl =
    configured && configured.trim().length > 0
      ? configured
      : typeof window !== "undefined"
        ? window.location.origin
        : getAppBaseUrl();

  return `${baseUrl}/asset-public/${assetId}`;
}

export function getAssetAuthenticatedUrl(assetId: number) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl =
    configured && configured.trim().length > 0
      ? configured
      : typeof window !== "undefined"
        ? window.location.origin
        : getAppBaseUrl();

  return `${baseUrl}/asset/${assetId}`;
}
