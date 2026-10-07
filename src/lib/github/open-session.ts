import type { GitHubOpenFile } from "@/lib/github/types";

const OPEN_KEY = "textume.gh.open";

type Listener = () => void;

const listeners = new Set<Listener>();

let cachedRaw: string | null | undefined;
let cachedFile: GitHubOpenFile | null = null;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function parseOpenFile(raw: string): GitHubOpenFile | null {
  try {
    const parsed = JSON.parse(raw) as GitHubOpenFile;
    if (
      !parsed.owner ||
      !parsed.repo ||
      !parsed.path ||
      !parsed.sha ||
      typeof parsed.content !== "string" ||
      !parsed.branch ||
      !parsed.fullName
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function subscribeGitHubOpenFile(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setGitHubOpenFile(file: GitHubOpenFile): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = JSON.stringify(file);
    sessionStorage.setItem(OPEN_KEY, raw);
    cachedRaw = raw;
    cachedFile = file;
    notify();
  } catch {
    throw new Error(
      "Could not keep this GitHub file open in the browser session (storage full or blocked).",
    );
  }
}

export function getGitHubOpenFile(): GitHubOpenFile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(OPEN_KEY);
  if (raw === cachedRaw) {
    return cachedFile;
  }

  cachedRaw = raw;
  if (!raw) {
    cachedFile = null;
    return null;
  }

  const parsed = parseOpenFile(raw);
  if (!parsed) {
    sessionStorage.removeItem(OPEN_KEY);
    cachedRaw = null;
    cachedFile = null;
    return null;
  }

  cachedFile = parsed;
  return cachedFile;
}

export function updateGitHubOpenFile(
  updates: Partial<Pick<GitHubOpenFile, "content" | "sha">>,
): GitHubOpenFile | null {
  const current = getGitHubOpenFile();
  if (!current) {
    return null;
  }

  const next: GitHubOpenFile = {
    ...current,
    ...updates,
  };
  setGitHubOpenFile(next);
  return next;
}

export function clearGitHubOpenFile(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(OPEN_KEY);
  cachedRaw = null;
  cachedFile = null;
  notify();
}
