import { GITHUB_OAUTH_SCOPE, isGitHubConfigured } from "@/lib/github/config";
import { clearGitHubOpenFile } from "@/lib/github/open-session";
import {
  clearAccessToken,
  hasStoredCredential,
  readAccessToken,
  storeAccessToken,
} from "@/lib/github/token-store";
import type {
  DeviceAuthorization,
  DeviceTokenPending,
  DeviceTokenResult,
  DeviceTokenSuccess,
  GitHubUser,
} from "@/lib/github/types";

export {
  GITHUB_OAUTH_SCOPE,
  GITHUB_PERMISSIONS_EXPLANATION,
  getGitHubClientId,
  isGitHubConfigured,
} from "@/lib/github/config";

type AuthListener = () => void;

const listeners = new Set<AuthListener>();

function notifyAuthChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeGitHubAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isGitHubConnected(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return hasStoredCredential();
}

export async function getGitHubAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  return readAccessToken();
}

export async function startDeviceAuthorization(): Promise<DeviceAuthorization> {
  if (!isGitHubConfigured()) {
    throw new Error(
      "GitHub is not configured. Set NEXT_PUBLIC_GITHUB_CLIENT_ID to enable Connect GitHub.",
    );
  }

  const response = await fetch("/api/github/oauth/device", {
    method: "POST",
  });

  const payload = (await response.json()) as {
    error?: string;
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    expires_in?: number;
    interval?: number;
  };

  if (!response.ok || !payload.device_code || !payload.user_code) {
    throw new Error(payload.error ?? "Could not start GitHub authorization.");
  }

  return {
    deviceCode: payload.device_code,
    userCode: payload.user_code,
    verificationUri: payload.verification_uri ?? "https://github.com/login/device",
    expiresIn: payload.expires_in ?? 900,
    interval: payload.interval ?? 5,
  };
}

export async function pollDeviceToken(
  deviceCode: string,
): Promise<DeviceTokenResult> {
  const response = await fetch("/api/github/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode }),
  });

  const payload = (await response.json()) as {
    error?: string;
    access_token?: string;
    token_type?: string;
    scope?: string;
    interval?: number;
  };

  if (payload.error === "authorization_pending") {
    return { status: "pending" } satisfies DeviceTokenPending;
  }

  if (payload.error === "slow_down") {
    return {
      status: "slow_down",
      interval: payload.interval,
    } satisfies DeviceTokenPending;
  }

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error ?? "GitHub authorization failed.");
  }

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "bearer",
    scope: payload.scope ?? GITHUB_OAUTH_SCOPE,
  } satisfies DeviceTokenSuccess;
}

export async function completeDeviceAuthorization(
  result: DeviceTokenSuccess,
): Promise<void> {
  await storeAccessToken(result.accessToken);
  notifyAuthChange();
}

export function clearGitHubSession(): void {
  clearAccessToken();
  clearGitHubOpenFile();
  notifyAuthChange();
}

export async function disconnectGitHub(): Promise<void> {
  clearGitHubSession();
}

export async function fetchGitHubUser(): Promise<GitHubUser> {
  const token = await getGitHubAccessToken();
  if (!token) {
    throw new Error("Not connected to GitHub.");
  }

  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 401) {
    clearGitHubSession();
    throw new Error("GitHub session expired. Connect again.");
  }

  if (!response.ok) {
    throw new Error(`Could not load GitHub user (${response.status}).`);
  }

  const data = (await response.json()) as {
    login: string;
    avatar_url?: string;
  };

  return {
    login: data.login,
    avatarUrl: data.avatar_url ?? null,
  };
}

export async function waitForDeviceAuthorization(
  authorization: DeviceAuthorization,
  options?: { signal?: AbortSignal },
): Promise<DeviceTokenSuccess> {
  let intervalMs = Math.max(authorization.interval, 5) * 1000;
  const deadline = Date.now() + authorization.expiresIn * 1000;

  while (Date.now() < deadline) {
    if (options?.signal?.aborted) {
      throw new Error("Authorization cancelled.");
    }

    await sleep(intervalMs, options?.signal);

    const result = await pollDeviceToken(authorization.deviceCode);

    if ("accessToken" in result) {
      await completeDeviceAuthorization(result);
      return result;
    }

    if (result.status === "slow_down") {
      intervalMs = Math.max(
        intervalMs + 5000,
        (result.interval ?? authorization.interval) * 1000,
      );
    }
  }

  throw new Error("GitHub authorization timed out. Try again.");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Authorization cancelled."));
      return;
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      window.clearTimeout(timer);
      reject(new Error("Authorization cancelled."));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
