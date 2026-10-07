import type { GitHubRepository } from "@/lib/github/types";

const STORAGE_KEY = "textume.gh.linked-repo";

type Listener = () => void;

const listeners = new Set<Listener>();

let cachedRaw: string | null | undefined;
let cachedRepo: GitHubRepository | null = null;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function parseRepository(raw: string): GitHubRepository | null {
  try {
    const parsed = JSON.parse(raw) as GitHubRepository;
    if (
      !parsed.id ||
      !parsed.name ||
      !parsed.fullName ||
      !parsed.owner ||
      !parsed.defaultBranch
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function subscribeLinkedRepo(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLinkedRepository(): GitHubRepository | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedRepo;
  }

  cachedRaw = raw;
  if (!raw) {
    cachedRepo = null;
    return null;
  }

  const parsed = parseRepository(raw);
  if (!parsed) {
    localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
    cachedRepo = null;
    return null;
  }

  cachedRepo = parsed;
  return cachedRepo;
}

export function setLinkedRepository(repo: GitHubRepository): void {
  if (typeof window === "undefined") {
    return;
  }
  const raw = JSON.stringify(repo);
  localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedRepo = repo;
  notify();
}

export function clearLinkedRepository(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  cachedRaw = null;
  cachedRepo = null;
  notify();
}
