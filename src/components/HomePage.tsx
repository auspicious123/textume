"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CreateResumeForm } from "@/components/CreateResumeForm";
import { ImportTexPanel } from "@/components/ImportTexPanel";
import { CreateGitHubResumeForm } from "@/components/github/CreateGitHubResumeForm";
import { GitHubResumeListItem } from "@/components/github/GitHubResumeListItem";
import { RenameGitHubResumeForm } from "@/components/github/RenameGitHubResumeForm";
import { ResumeListItem } from "@/components/ResumeListItem";
import { ResumeNameForm } from "@/components/ResumeNameForm";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { SegmentControl } from "@/components/ui/SegmentControl";
import { Toast } from "@/components/ui/Toast";
import { useGitHubAuth } from "@/hooks/useGitHubAuth";
import {
  useGitHubResumes,
  type GitHubResumeItem,
} from "@/hooks/useGitHubResumes";
import { useLinkedRepository } from "@/hooks/useLinkedRepository";
import { useIsClient, useResumes } from "@/hooks/useResumes";
import { getFileContent } from "@/lib/github/files";
import {
  getHubSegment,
  getHubSegmentServerSnapshot,
  setHubSegment,
  subscribeHubSegment,
} from "@/lib/hub-segment";
import { setGitHubOpenFile } from "@/lib/github/open-session";
import {
  createResumeInFolder,
  deleteResumeInFolder,
  renameResumeInFolder,
  RESUMES_DIR,
} from "@/lib/github/resumes";
import {
  createResume,
  createResumeFromSource,
  deleteResume,
  duplicateResume,
  renameResume,
} from "@/lib/resume-storage";
import { getTemplateById } from "@/lib/templates/catalog";
import type { Resume } from "@/types/resume";

type DialogState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "import" }
  | { type: "rename"; resume: Resume }
  | { type: "github-create" }
  | { type: "github-rename"; resume: GitHubResumeItem };

export function HomePage() {
  const router = useRouter();
  const resumes = useResumes();
  const isClient = useIsClient();
  const github = useGitHubAuth();
  const linkedRepo = useLinkedRepository();
  const githubResumes = useGitHubResumes(github.connected, linkedRepo);
  const segment = useSyncExternalStore(
    subscribeHubSegment,
    getHubSegment,
    getHubSegmentServerSnapshot,
  );
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [openingPath, setOpeningPath] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function changeSegment(next: "local" | "github") {
    setHubSegment(next);
  }

  function handleCreate(name: string, templateId: string) {
    const resume = createResume(name, templateId);
    setDialog({ type: "closed" });
    router.push(`/resumes/${resume.id}`);
  }

  function handleImport(name: string, latex: string) {
    const resume = createResumeFromSource(name, latex);
    setDialog({ type: "closed" });
    router.push(`/resumes/${resume.id}`);
  }

  function handleRename(name: string) {
    if (dialog.type !== "rename") {
      return;
    }
    renameResume(dialog.resume.id, name);
    setDialog({ type: "closed" });
    setToast({ type: "success", message: "Resume renamed." });
  }

  function handleDuplicate(resume: Resume) {
    const copy = duplicateResume(resume.id);
    if (copy) {
      setToast({ type: "success", message: "Resume duplicated." });
      router.push(`/resumes/${copy.id}`);
    }
  }

  function handleDelete(resume: Resume) {
    const confirmed = window.confirm(
      `Delete "${resume.name}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    deleteResume(resume.id);
    setToast({ type: "success", message: "Resume deleted." });
  }

  async function handleOpenGitHubResume(item: GitHubResumeItem) {
    if (!linkedRepo) {
      return;
    }

    setOpeningPath(item.path);
    setToast(null);

    try {
      const file = await getFileContent(
        linkedRepo.owner,
        linkedRepo.name,
        item.path,
        linkedRepo.defaultBranch,
      );

      setGitHubOpenFile({
        owner: linkedRepo.owner,
        repo: linkedRepo.name,
        path: file.path,
        sha: file.sha,
        content: file.content,
        branch: linkedRepo.defaultBranch,
        fullName: linkedRepo.fullName,
      });
      router.push("/github/edit");
    } catch (err) {
      setToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Could not open GitHub resume.",
      });
      setOpeningPath(null);
    }
  }

  async function handleCreateGitHubResume(name: string, templateId: string) {
    if (!linkedRepo) {
      return;
    }

    const template = getTemplateById(templateId);
    if (!template) {
      setActionError("Unknown template.");
      return;
    }

    setActionBusy(true);
    setActionError(null);

    try {
      const result = await createResumeInFolder({
        owner: linkedRepo.owner,
        repo: linkedRepo.name,
        name,
        content: template.source,
        branch: linkedRepo.defaultBranch,
      });

      setDialog({ type: "closed" });
      githubResumes.refresh();

      const file = await getFileContent(
        linkedRepo.owner,
        linkedRepo.name,
        result.path,
        linkedRepo.defaultBranch,
      );

      setGitHubOpenFile({
        owner: linkedRepo.owner,
        repo: linkedRepo.name,
        path: file.path,
        sha: file.sha,
        content: file.content,
        branch: linkedRepo.defaultBranch,
        fullName: linkedRepo.fullName,
      });
      router.push("/github/edit");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not create GitHub resume.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRenameGitHubResume(name: string) {
    if (!linkedRepo || dialog.type !== "github-rename") {
      return;
    }

    setActionBusy(true);
    setActionError(null);

    try {
      await renameResumeInFolder({
        owner: linkedRepo.owner,
        repo: linkedRepo.name,
        path: dialog.resume.path,
        sha: dialog.resume.sha,
        newName: name,
        branch: linkedRepo.defaultBranch,
      });
      setDialog({ type: "closed" });
      githubResumes.refresh();
      setToast({ type: "success", message: "GitHub resume renamed." });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not rename GitHub resume.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeleteGitHubResume(item: GitHubResumeItem) {
    if (!linkedRepo) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${item.name}" from GitHub? This creates a commit and cannot be undone easily.`,
    );
    if (!confirmed) {
      return;
    }

    setActionBusy(true);

    try {
      await deleteResumeInFolder({
        owner: linkedRepo.owner,
        repo: linkedRepo.name,
        path: item.path,
        sha: item.sha,
        branch: linkedRepo.defaultBranch,
      });
      githubResumes.refresh();
      setToast({ type: "success", message: "GitHub resume deleted." });
    } catch (err) {
      setToast({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not delete GitHub resume.",
      });
    } finally {
      setActionBusy(false);
    }
  }

  const modalTitle =
    dialog.type === "rename"
      ? "Rename resume"
      : dialog.type === "import"
        ? "Import .tex"
        : dialog.type === "github-create"
          ? "Create GitHub resume"
          : dialog.type === "github-rename"
            ? "Rename GitHub resume"
            : "Create resume";

  const modalSize = dialog.type === "github-create" ? "lg" : "md";

  return (
    <Container className="py-10">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Resumes
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Edit LaTeX and compile to PDF in your browser.
            </p>
          </div>
          <SegmentControl
            ariaLabel="Resume source"
            value={segment}
            onChange={changeSegment}
            options={[
              { value: "local" as const, label: "This browser" },
              { value: "github" as const, label: "GitHub" },
            ]}
          />
        </div>

        {toast ? (
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        ) : null}

        {segment === "local" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setDialog({ type: "create" })}>
                New resume
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDialog({ type: "import" })}
              >
                Import .tex
              </Button>
            </div>

            {!isClient ? (
              <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center text-sm text-ink-muted">
                Loading resumes…
              </div>
            ) : resumes.length === 0 ? (
              <EmptyState
                title="No resumes yet"
                description="Create one or import a .tex file. They stay in this browser until you move them to GitHub."
                action={
                  <Button onClick={() => setDialog({ type: "create" })}>
                    New resume
                  </Button>
                }
              />
            ) : (
              <ul className="rounded-lg border border-line bg-surface px-4">
                {resumes.map((resume) => (
                  <ResumeListItem
                    key={resume.id}
                    resume={resume}
                    onRename={(item) =>
                      setDialog({ type: "rename", resume: item })
                    }
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!isClient ? (
              <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center text-sm text-ink-muted">
                Loading…
              </div>
            ) : !github.connected || !linkedRepo ? (
              <EmptyState
                title={
                  !github.connected
                    ? "Connect GitHub to sync resumes"
                    : "Choose a repository"
                }
                description={
                  !github.connected
                    ? "Optional. Connect once, pick a repo with a /resumes folder, then edit here."
                    : `Pick a repository on the GitHub page. Textume looks for /${RESUMES_DIR}.`
                }
                action={
                  <Link href="/github">
                    <Button>
                      {!github.connected ? "Set up GitHub" : "Choose repository"}
                    </Button>
                  </Link>
                }
              />
            ) : githubResumes.loading ? (
              <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center text-sm text-ink-muted">
                Loading /{RESUMES_DIR}…
              </div>
            ) : githubResumes.error ? (
              <EmptyState
                title="Could not load GitHub resumes"
                description={githubResumes.error}
                action={
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={githubResumes.refresh}>
                      Retry
                    </Button>
                    <Link href="/github">
                      <Button variant="secondary">GitHub settings</Button>
                    </Link>
                  </div>
                }
              />
            ) : githubResumes.folderMissing ? (
              <EmptyState
                title={`No /${RESUMES_DIR} folder`}
                description={`Create the folder on the GitHub setup page, then come back here.`}
                action={
                  <Link href="/github">
                    <Button>Open GitHub setup</Button>
                  </Link>
                }
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => {
                      setActionError(null);
                      setDialog({ type: "github-create" });
                    }}
                  >
                    New on GitHub
                  </Button>
                  <Button variant="secondary" onClick={githubResumes.refresh}>
                    Refresh
                  </Button>
                  <p className="ml-auto font-mono text-xs text-ink-muted">
                    {linkedRepo.fullName}/{RESUMES_DIR}
                  </p>
                </div>

                {githubResumes.items.length === 0 ? (
                  <EmptyState
                    title={`No resumes in /${RESUMES_DIR}`}
                    description="Create a .tex resume in this folder to get started."
                    action={
                      <Button
                        onClick={() => {
                          setActionError(null);
                          setDialog({ type: "github-create" });
                        }}
                      >
                        New on GitHub
                      </Button>
                    }
                  />
                ) : (
                  <ul className="rounded-lg border border-line bg-surface px-4">
                    {githubResumes.items.map((item) => (
                      <GitHubResumeListItem
                        key={item.path}
                        resume={item}
                        busy={openingPath === item.path || actionBusy}
                        onOpen={(resume) => void handleOpenGitHubResume(resume)}
                        onRename={(resume) => {
                          setActionError(null);
                          setDialog({ type: "github-rename", resume });
                        }}
                        onDelete={(resume) =>
                          void handleDeleteGitHubResume(resume)
                        }
                      />
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <Modal
        open={dialog.type !== "closed"}
        title={modalTitle}
        size={modalSize}
        onClose={() => {
          if (!actionBusy) {
            setDialog({ type: "closed" });
            setActionError(null);
          }
        }}
      >
        {dialog.type === "create" ? (
          <CreateResumeForm
            onSubmit={handleCreate}
            onCancel={() => setDialog({ type: "closed" })}
          />
        ) : null}
        {dialog.type === "import" ? (
          <ImportTexPanel
            onImport={handleImport}
            onCancel={() => setDialog({ type: "closed" })}
          />
        ) : null}
        {dialog.type === "rename" ? (
          <ResumeNameForm
            initialName={dialog.resume.name}
            submitLabel="Save"
            onSubmit={handleRename}
            onCancel={() => setDialog({ type: "closed" })}
          />
        ) : null}
        {dialog.type === "github-create" ? (
          <CreateGitHubResumeForm
            busy={actionBusy}
            error={actionError}
            onSubmit={(name, templateId) =>
              void handleCreateGitHubResume(name, templateId)
            }
            onCancel={() => {
              if (!actionBusy) {
                setDialog({ type: "closed" });
                setActionError(null);
              }
            }}
          />
        ) : null}
        {dialog.type === "github-rename" ? (
          <RenameGitHubResumeForm
            initialName={dialog.resume.name}
            busy={actionBusy}
            error={actionError}
            onSubmit={(name) => void handleRenameGitHubResume(name)}
            onCancel={() => {
              if (!actionBusy) {
                setDialog({ type: "closed" });
                setActionError(null);
              }
            }}
          />
        ) : null}
      </Modal>
    </Container>
  );
}
