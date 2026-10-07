"use client";

import Link from "next/link";
import { useState } from "react";
import { ConnectGitHubPanel } from "@/components/github/ConnectGitHubPanel";
import { GitHubRepoPicker } from "@/components/github/GitHubRepoPicker";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useGitHubAuth } from "@/hooks/useGitHubAuth";
import { useGitHubResumes } from "@/hooks/useGitHubResumes";
import { useLinkedRepository } from "@/hooks/useLinkedRepository";
import { useIsClient } from "@/hooks/useResumes";
import {
  clearLinkedRepository,
  setLinkedRepository,
} from "@/lib/github/linked-repo";
import { createResumesFolder, RESUMES_DIR } from "@/lib/github/resumes";

type DialogState =
  | { type: "closed" }
  | { type: "connect" }
  | { type: "repo" };

export function GitHubSetupPage() {
  const isClient = useIsClient();
  const github = useGitHubAuth();
  const linkedRepo = useLinkedRepository();
  const githubResumes = useGitHubResumes(github.connected, linkedRepo);
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleDisconnect() {
    clearLinkedRepository();
    await github.disconnect();
    setToast({ type: "success", message: "Disconnected from GitHub." });
  }

  async function handleCreateResumesFolder() {
    if (!linkedRepo) {
      return;
    }

    setBusy(true);
    try {
      await createResumesFolder({
        owner: linkedRepo.owner,
        repo: linkedRepo.name,
        branch: linkedRepo.defaultBranch,
      });
      githubResumes.refresh();
      setToast({
        type: "success",
        message: `Created /${RESUMES_DIR} in ${linkedRepo.fullName}.`,
      });
    } catch (err) {
      setToast({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : `Could not create /${RESUMES_DIR}.`,
      });
    } finally {
      setBusy(false);
    }
  }

  if (!isClient) {
    return (
      <Container className="py-10">
        <p className="text-sm text-ink-muted">Loading…</p>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="mb-8">
        <Link
          href="/"
          className="text-xs text-ink-muted hover:text-ink hover:underline"
        >
          ← Back to Resumes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          GitHub
        </h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">
          Optional sync. Connect once, choose a repository, and keep .tex files
          under /{RESUMES_DIR}.
        </p>
      </div>

      {toast ? (
        <div className="mb-6">
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        </div>
      ) : null}

      <div className="space-y-4">
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Account</h2>
          {!github.configured ? (
            <p className="mt-2 text-sm text-ink-muted">
              Add{" "}
              <code className="rounded bg-paper px-1 py-0.5 text-xs">
                NEXT_PUBLIC_GITHUB_CLIENT_ID
              </code>{" "}
              to enable Connect GitHub.
            </p>
          ) : !github.connected ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink-muted">Not connected.</p>
              <Button onClick={() => setDialog({ type: "connect" })}>
                Connect GitHub
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-ink">
                {github.loading ? (
                  <p className="text-ink-muted">Checking session…</p>
                ) : github.error ? (
                  <p className="text-danger">{github.error}</p>
                ) : github.user ? (
                  <p>
                    Connected as{" "}
                    <span className="font-medium">@{github.user.login}</span>
                  </p>
                ) : (
                  <p>Connected.</p>
                )}
              </div>
              <div className="flex gap-2">
                {github.error ? (
                  <Button variant="secondary" onClick={github.refresh}>
                    Retry
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={() => void handleDisconnect()}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Repository</h2>
          {!github.connected ? (
            <p className="mt-2 text-sm text-ink-muted">
              Connect GitHub first, then choose a repository.
            </p>
          ) : !linkedRepo ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink-muted">No repository selected.</p>
              <Button onClick={() => setDialog({ type: "repo" })}>
                Choose repository
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="font-mono text-sm text-ink">{linkedRepo.fullName}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setDialog({ type: "repo" })}
                >
                  Change repository
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearLinkedRepository();
                    setToast({
                      type: "success",
                      message: "Repository unlinked.",
                    });
                  }}
                >
                  Unlink
                </Button>
              </div>
            </div>
          )}
        </section>

        {linkedRepo ? (
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">
              /{RESUMES_DIR} folder
            </h2>
            {githubResumes.loading ? (
              <p className="mt-2 text-sm text-ink-muted">Checking…</p>
            ) : githubResumes.error ? (
              <p className="mt-2 text-sm text-danger">{githubResumes.error}</p>
            ) : githubResumes.folderMissing ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-ink-muted">
                  This repository does not have a /{RESUMES_DIR} folder yet.
                </p>
                <Button
                  onClick={() => void handleCreateResumesFolder()}
                  disabled={busy}
                >
                  {busy ? "Creating…" : `Create /${RESUMES_DIR}`}
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-muted">
                  Ready. {githubResumes.items.length} resume
                  {githubResumes.items.length === 1 ? "" : "s"} found.
                </p>
                <Link href="/">
                  <Button variant="secondary">View resumes</Button>
                </Link>
              </div>
            )}
          </section>
        ) : null}
      </div>

      <Modal
        open={dialog.type !== "closed"}
        title={
          dialog.type === "connect" ? "Connect GitHub" : "Choose repository"
        }
        size="lg"
        onClose={() => setDialog({ type: "closed" })}
      >
        {dialog.type === "connect" ? (
          <ConnectGitHubPanel
            onConnected={() => setDialog({ type: "repo" })}
            onCancel={() => setDialog({ type: "closed" })}
          />
        ) : null}
        {dialog.type === "repo" ? (
          <GitHubRepoPicker
            onSelect={(repo) => {
              setLinkedRepository(repo);
              setDialog({ type: "closed" });
              setToast({
                type: "success",
                message: `Linked ${repo.fullName}.`,
              });
            }}
            onCancel={() => setDialog({ type: "closed" })}
          />
        ) : null}
      </Modal>
    </Container>
  );
}
