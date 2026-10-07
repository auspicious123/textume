"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getResume,
  listResumes,
  subscribeResumes,
} from "@/lib/resume-storage";
import type { Resume } from "@/types/resume";

const EMPTY_RESUMES: Resume[] = [];

function getServerSnapshot(): Resume[] {
  return EMPTY_RESUMES;
}

export function useResumes(): Resume[] {
  return useSyncExternalStore(subscribeResumes, listResumes, getServerSnapshot);
}

export function useResume(id: string): Resume | null {
  const getSnapshot = useCallback(() => getResume(id), [id]);
  return useSyncExternalStore(subscribeResumes, getSnapshot, () => null);
}

export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
