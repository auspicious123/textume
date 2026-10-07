"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getResumesFolderStatus,
  resumeDisplayName,
} from "@/lib/github/resumes";
import type { GitHubRepository } from "@/lib/github/types";

export type GitHubResumeItem = {
  path: string;
  name: string;
  sha: string;
  size: number;
};

type Bundle = {
  key: string;
  folderMissing?: boolean;
  items?: GitHubResumeItem[];
  error?: string;
};

export function useGitHubResumes(
  connected: boolean,
  repo: GitHubRepository | null,
) {
  const [reloadKey, setReloadKey] = useState(0);
  const [bundle, setBundle] = useState<Bundle | null>(null);

  const requestKey =
    connected && repo
      ? `${repo.fullName}@${repo.defaultBranch}:${reloadKey}`
      : "";

  const refresh = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!connected || !repo || !requestKey) {
      return;
    }

    let cancelled = false;

    void getResumesFolderStatus(repo.owner, repo.name, repo.defaultBranch)
      .then((status) => {
        if (cancelled) {
          return;
        }
        if (status.status === "missing") {
          setBundle({ key: requestKey, folderMissing: true, items: [] });
          return;
        }
        setBundle({
          key: requestKey,
          folderMissing: false,
          items: status.files.map((file) => ({
            path: file.path,
            name: resumeDisplayName(file.path),
            sha: file.sha,
            size: file.size,
          })),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setBundle({
          key: requestKey,
          error:
            err instanceof Error
              ? err.message
              : "Could not load GitHub resumes.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [connected, repo, requestKey]);

  if (!connected || !repo) {
    return {
      items: [] as GitHubResumeItem[],
      error: null as string | null,
      loading: false,
      folderMissing: false,
      refresh,
    };
  }

  const ready = bundle?.key === requestKey;

  return {
    items: ready && bundle.items ? bundle.items : [],
    error: ready ? (bundle.error ?? null) : null,
    loading: !ready,
    folderMissing: ready ? Boolean(bundle.folderMissing) : false,
    refresh,
  };
}
