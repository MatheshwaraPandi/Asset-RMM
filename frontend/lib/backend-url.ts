export function getBackendBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_API_URL ??
    process.env.BACKEND_API_URL ??
    "http://127.0.0.1:8000"
  );
}
