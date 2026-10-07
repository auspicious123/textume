const SESSION_KEY = "textume.gh.token";
const LEGACY_KEY = "textume.gh.cred";

export async function storeAccessToken(token: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(LEGACY_KEY);
  sessionStorage.setItem(SESSION_KEY, token);
}

export async function readAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const token = sessionStorage.getItem(SESSION_KEY);
  if (token) {
    return token;
  }

  if (sessionStorage.getItem(LEGACY_KEY)) {
    sessionStorage.removeItem(LEGACY_KEY);
  }

  return null;
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LEGACY_KEY);
}

export function hasStoredCredential(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return sessionStorage.getItem(SESSION_KEY) !== null;
}
