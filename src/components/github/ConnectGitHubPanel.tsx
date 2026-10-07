"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  GITHUB_OAUTH_SCOPE,
  GITHUB_PERMISSIONS_EXPLANATION,
  isGitHubConfigured,
  startDeviceAuthorization,
  waitForDeviceAuthorization,
} from "@/lib/github/auth";
import type { DeviceAuthorization } from "@/lib/github/types";

type ConnectGitHubPanelProps = {
  onConnected: () => void;
  onCancel: () => void;
};

type Phase =
  | { type: "explain" }
  | { type: "authorize"; auth: DeviceAuthorization }
  | { type: "error"; message: string };

export function ConnectGitHubPanel({
  onConnected,
  onCancel,
}: ConnectGitHubPanelProps) {
  const [phase, setPhase] = useState<Phase>({ type: "explain" });
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function handleConnect() {
    if (!isGitHubConfigured()) {
      setPhase({
        type: "error",
        message:
          "Set NEXT_PUBLIC_GITHUB_CLIENT_ID in your environment to enable GitHub.",
      });
      return;
    }

    setBusy(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const auth = await startDeviceAuthorization();
      setPhase({ type: "authorize", auth });
      setBusy(false);
      await waitForDeviceAuthorization(auth, { signal: controller.signal });
      onConnected();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setPhase({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not connect to GitHub.",
      });
      setBusy(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    onCancel();
  }

  if (phase.type === "error") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-danger">{phase.message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setPhase({ type: "explain" });
              void handleConnect();
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (phase.type === "authorize") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Enter this code on GitHub to authorize Textume:
        </p>
        <p className="rounded-md border border-line bg-paper px-4 py-3 text-center font-mono text-2xl tracking-widest text-ink">
          {phase.auth.userCode}
        </p>
        <p className="text-sm text-ink-muted">
          Open{" "}
          <a
            href={phase.auth.verificationUri}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink underline"
          >
            {phase.auth.verificationUri}
          </a>{" "}
          and approve access. Waiting for authorization…
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Connect GitHub to open and save .tex resumes from a repository. This is
        optional — local resumes keep working without it.
      </p>
      <div className="rounded-md border border-line bg-paper px-4 py-3">
        <p className="text-sm font-medium text-ink">Permissions requested</p>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          scope: {GITHUB_OAUTH_SCOPE}
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-muted">
          {GITHUB_PERMISSIONS_EXPLANATION.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      {!isGitHubConfigured() ? (
        <p className="text-sm text-amber-700">
          GitHub is not configured in this environment. Add{" "}
          <code className="rounded bg-paper px-1 py-0.5 text-xs">
            NEXT_PUBLIC_GITHUB_CLIENT_ID
          </code>{" "}
          (and optionally{" "}
          <code className="rounded bg-paper px-1 py-0.5 text-xs">
            GITHUB_CLIENT_SECRET
          </code>{" "}
          on the server) to enable Connect GitHub.
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={() => void handleConnect()} disabled={busy}>
          {busy ? "Starting…" : "Authorize GitHub"}
        </Button>
      </div>
    </div>
  );
}
