// Calls a technician API and returns its JSON. A 401 means the session ended, so send them to log in again.
export async function techFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (res.status === 401) {
    await fetch("/api/technician/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/technician/login";
    throw new Error("Session ended");
  }
  return res.json();
}
