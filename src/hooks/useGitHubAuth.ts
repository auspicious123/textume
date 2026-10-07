"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  disconnectGitHub,
  fetchGitHubUser,
  isGitHubConnected,
  isGitHubConfigured,
  subscribeGitHubAuth,
} from "@/lib/github/auth";
import type { GitHubUser } from "@/lib/github/types";

export function useGitHubAuth() {
  const configured = isGitHubConfigured();
  const connected = useSyncExternalStore(
    subscribeGitHubAuth,
    isGitHubConnected,
    () => false,
  );
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    if (!configured || !connected) {
      return;
    }

    let cancelled = false;

    void fetchGitHubUser()
      .then((nextUser) => {
        if (cancelled) {
          return;
        }
        setUser(nextUser);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setUser(null);
        setError(err instanceof Error ? err.message : "GitHub auth error");
      });

    return () => {
      cancelled = true;
    };
  }, [configured, connected, requestKey]);

  const disconnect = useCallback(async () => {
    await disconnectGitHub();
    setUser(null);
    setError(null);
  }, []);

  const refresh = useCallback(() => {
    if (!configured || !connected) {
      return;
    }
    setUser(null);
    setError(null);
    setRequestKey((value) => value + 1);
  }, [configured, connected]);

  const loading = Boolean(connected && configured && !user && !error);

  return {
    configured,
    connected,
    user: connected ? user : null,
    loading,
    error: connected ? error : null,
    refresh,
    disconnect,
  };
}
