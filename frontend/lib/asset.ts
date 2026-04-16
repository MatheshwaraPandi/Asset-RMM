export type Asset = {
  id: number;
  employee_name?: string | null;
  employee_id?: string | null;
  email?: string | null;
  laptop_no?: string | null;
  charger_no?: string | null;
  mouse_no?: string | null;

  hostname?: string | null;
  os_name?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  cpu?: string | null;
  ram?: string | null;
  storage?: string | null;
  last_updated?: string | null;
};

export type AssignmentForm = {
  employee_name: string;
  employee_id: string;
  email: string;
  laptop_no: string;
  charger_no: string;
  mouse_no: string;
};

export const emptyForm: AssignmentForm = {
  employee_name: "",
  employee_id: "",
  email: "",
  laptop_no: "",
  charger_no: "",
  mouse_no: "",
};

export function getAssignmentForm(asset: Asset): AssignmentForm {
  return {
    employee_name: asset.employee_name ?? "",
    employee_id: asset.employee_id ?? "",
    email: asset.email ?? "",
    laptop_no: asset.laptop_no ?? "",
    charger_no: asset.charger_no ?? "",
    mouse_no: asset.mouse_no ?? "",
  };
}

export function formatValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return value;
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

  return `${baseUrl}/asset/${assetId}`;
}
