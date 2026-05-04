export function getBackendBaseUrl() {
  const serverUrl = process.env.BACKEND_API_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();

  if (typeof window === "undefined") {
    return serverUrl || publicUrl || "http://127.0.0.1:8000";
  }

  return publicUrl || serverUrl || "http://127.0.0.1:8000";
}
