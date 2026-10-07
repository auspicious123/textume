"use client";

import { useSyncExternalStore } from "react";
import {
  getLinkedRepository,
  subscribeLinkedRepo,
} from "@/lib/github/linked-repo";
import type { GitHubRepository } from "@/lib/github/types";

const SERVER_SNAPSHOT: GitHubRepository | null = null;

function getServerSnapshot(): GitHubRepository | null {
  return SERVER_SNAPSHOT;
}

export function useLinkedRepository(): GitHubRepository | null {
  return useSyncExternalStore(
    subscribeLinkedRepo,
    getLinkedRepository,
    getServerSnapshot,
  );
}
