import { clearGitHubSession, getGitHubAccessToken } from "@/lib/github/auth";

const API_VERSION = "2022-11-28";

export class GitHubApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

export async function githubFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getGitHubAccessToken();
  if (!token) {
    throw new GitHubApiError("Not connected to GitHub.", 401);
  }

  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-GitHub-Api-Version", API_VERSION);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearGitHubSession();
    throw new GitHubApiError("GitHub session expired. Connect again.", 401);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `GitHub API error (${response.status}).`;
    throw new GitHubApiError(message, response.status);
  }

  return payload as T;
}
