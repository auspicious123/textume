import {
  DEFAULT_TEMPLATE_ID,
  getTemplateById,
} from "@/lib/templates/catalog";
import type { Resume } from "@/types/resume";

const STORAGE_KEY = "textume.resumes";

const listeners = new Set<() => void>();
let cachedList: Resume[] | null = null;
const cachedById = new Map<string, Resume | null>();

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function invalidateCache(): void {
  cachedList = null;
  cachedById.clear();
}

function notify(): void {
  invalidateCache();
  listeners.forEach((listener) => listener());
}

export function subscribeResumes(listener: () => void): () => void {
  listeners.add(listener);

  if (canUseStorage()) {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return () => {
    listeners.delete(listener);
  };
}

function readAll(): Resume[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isResume);
  } catch {
    return [];
  }
}

function writeAll(resumes: Resume[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
  notify();
}

function isResume(value: unknown): value is Resume {
  if (!value || typeof value !== "object") {
    return false;
  }

  const resume = value as Record<string, unknown>;
  return (
    typeof resume.id === "string" &&
    typeof resume.name === "string" &&
    typeof resume.latex === "string" &&
    typeof resume.createdAt === "string" &&
    typeof resume.updatedAt === "string"
  );
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `resume_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function listResumes(): Resume[] {
  if (cachedList) {
    return cachedList;
  }

  cachedList = readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return cachedList;
}

export function getResume(id: string): Resume | null {
  if (cachedById.has(id)) {
    return cachedById.get(id) ?? null;
  }

  const resume = readAll().find((item) => item.id === id) ?? null;
  cachedById.set(id, resume);
  return resume;
}

export function createResume(name: string, templateId = DEFAULT_TEMPLATE_ID): Resume {
  const template = getTemplateById(templateId) ?? getTemplateById(DEFAULT_TEMPLATE_ID);
  return createResumeFromSource(name, template?.source ?? "");
}

export function createResumeFromSource(name: string, latex: string): Resume {
  const timestamp = now();
  const resume: Resume = {
    id: createId(),
    name: name.trim() || "Untitled Resume",
    latex,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const resumes = readAll();
  resumes.push(resume);
  writeAll(resumes);
  return resume;
}

export function updateResume(
  id: string,
  updates: Partial<Pick<Resume, "name" | "latex">>,
): Resume | null {
  const resumes = readAll();
  const index = resumes.findIndex((resume) => resume.id === id);

  if (index === -1) {
    return null;
  }

  const current = resumes[index];
  const next: Resume = {
    ...current,
    name:
      updates.name !== undefined
        ? updates.name.trim() || current.name
        : current.name,
    latex: updates.latex !== undefined ? updates.latex : current.latex,
    updatedAt: now(),
  };

  resumes[index] = next;
  writeAll(resumes);
  return next;
}

export function renameResume(id: string, name: string): Resume | null {
  return updateResume(id, { name });
}

export function deleteResume(id: string): boolean {
  const resumes = readAll();
  const next = resumes.filter((resume) => resume.id !== id);

  if (next.length === resumes.length) {
    return false;
  }

  writeAll(next);
  return true;
}

export function duplicateResume(id: string): Resume | null {
  const source = getResume(id);
  if (!source) {
    return null;
  }

  const timestamp = now();
  const copy: Resume = {
    id: createId(),
    name: `${source.name} (Copy)`,
    latex: source.latex,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const resumes = readAll();
  resumes.push(copy);
  writeAll(resumes);
  return copy;
}
