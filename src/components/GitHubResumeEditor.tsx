"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CompilationOutput } from "@/components/CompilationOutput";
import { LatexEditor } from "@/components/LatexEditor";
import { PdfPreviewLazy as PdfPreview } from "@/components/PdfPreviewLazy";
import { SaveToGitHubForm } from "@/components/github/SaveToGitHubForm";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useIsClient } from "@/hooks/useResumes";
import {
  commitFileContent,
  displayNameFromPath,
} from "@/lib/github/files";
import {
  getGitHubOpenFile,
  subscribeGitHubOpenFile,
  updateGitHubOpenFile,
} from "@/lib/github/open-session";
import { compileLatex } from "@/lib/latex/compiler";

type CompileStatus = "idle" | "compiling" | "success" | "failure";

const AUTO_COMPILE_DEBOUNCE_MS = 1500;
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
const OPEN_FILE_SERVER_SNAPSHOT = null;

function getGitHubOpenFileServerSnapshot() {
  return OPEN_FILE_SERVER_SNAPSHOT;
}

function subscribeDesktop(onStoreChange: () => void) {
  const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export function GitHubResumeEditor() {
  const isClient = useIsClient();
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    () => false,
  );
  const file = useSyncExternalStore(
    subscribeGitHubOpenFile,
    getGitHubOpenFile,
    getGitHubOpenFileServerSnapshot,
  );
  const [draftLatex, setDraftLatex] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [compileStatus, setCompileStatus] = useState<CompileStatus>("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileLog, setCompileLog] = useState("");
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [autoCompileUser, setAutoCompileUser] = useState<boolean | null>(null);
  const autoCompileTimerRef = useRef<number | null>(null);
  const draftRef = useRef<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const autoCompileRef = useRef(false);
  const isCompilingRef = useRef(false);
  const pendingSourceRef = useRef<string | null>(null);
  const saveToastTimerRef = useRef<number | null>(null);

  const autoCompile = autoCompileUser ?? isDesktop;

  const revokePdfUrl = useCallback(() => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    autoCompileRef.current = autoCompile;
    if (!autoCompile && autoCompileTimerRef.current !== null) {
      window.clearTimeout(autoCompileTimerRef.current);
      autoCompileTimerRef.current = null;
    }
  }, [autoCompile]);

  const showSaveToast = useCallback(
    (type: "success" | "error", message: string) => {
      if (saveToastTimerRef.current !== null) {
        window.clearTimeout(saveToastTimerRef.current);
      }
      setSaveToast({ type, message });
      saveToastTimerRef.current = window.setTimeout(() => {
        saveToastTimerRef.current = null;
        setSaveToast(null);
      }, 4500);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (autoCompileTimerRef.current !== null) {
        window.clearTimeout(autoCompileTimerRef.current);
      }
      if (saveToastTimerRef.current !== null) {
        window.clearTimeout(saveToastTimerRef.current);
      }
      revokePdfUrl();
    };
  }, [revokePdfUrl]);

  const applyCompileResult = useCallback(
    (result: Awaited<ReturnType<typeof compileLatex>>) => {
      if (!result.ok || !result.pdf) {
        setCompileStatus("failure");
        setCompileLog(result.log);
        setCompileErrors(
          result.errors.length > 0
            ? result.errors
            : [`Compilation failed with status ${result.status}.`],
        );
        return;
      }

      const pdfBytes = new Uint8Array(result.pdf).slice();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      revokePdfUrl();
      pdfBytesRef.current = pdfBytes;
      pdfUrlRef.current = url;
      setPdfUrl(url);
      setCompileLog(result.log);
      setCompileErrors([]);
      setCompileStatus("success");
    },
    [revokePdfUrl],
  );

  const compileSource = useCallback(
    async (source: string) => {
      pendingSourceRef.current = source;

      if (isCompilingRef.current) {
        return;
      }

      isCompilingRef.current = true;
      setCompileStatus("compiling");
      setCompileErrors([]);

      try {
        while (pendingSourceRef.current !== null) {
          const toCompile = pendingSourceRef.current;
          pendingSourceRef.current = null;

          try {
            const result = await compileLatex({ source: toCompile });

            if (pendingSourceRef.current !== null) {
              continue;
            }

            applyCompileResult(result);
          } catch (error) {
            if (pendingSourceRef.current !== null) {
              continue;
            }

            const message =
              error instanceof Error
                ? error.message
                : "Unknown compilation error";
            setCompileStatus("failure");
            setCompileLog(message);
            setCompileErrors([message]);
          }
        }
      } finally {
        isCompilingRef.current = false;

        if (pendingSourceRef.current !== null) {
          void compileSource(pendingSourceRef.current);
        }
      }
    },
    [applyCompileResult],
  );

  const scheduleAutoCompile = useCallback(
    (source: string) => {
      if (!autoCompileRef.current) {
        return;
      }

      if (autoCompileTimerRef.current !== null) {
        window.clearTimeout(autoCompileTimerRef.current);
      }

      autoCompileTimerRef.current = window.setTimeout(() => {
        autoCompileTimerRef.current = null;
        void compileSource(source);
      }, AUTO_COMPILE_DEBOUNCE_MS);
    },
    [compileSource],
  );

  const handleChange = useCallback(
    (value: string) => {
      setDraftLatex(value);
      draftRef.current = value;
      setDirty(true);
      setSaveNotice(null);
      scheduleAutoCompile(value);
    },
    [scheduleAutoCompile],
  );

  const handleCompile = useCallback(() => {
    const source = draftRef.current ?? draftLatex ?? file?.content;
    if (source === undefined) {
      return;
    }

    if (autoCompileTimerRef.current !== null) {
      window.clearTimeout(autoCompileTimerRef.current);
      autoCompileTimerRef.current = null;
    }

    void compileSource(source);
  }, [compileSource, draftLatex, file?.content]);

  const initialCompileKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file?.content) {
      return;
    }
    const key = `${file.fullName}:${file.path}`;
    if (initialCompileKeyRef.current === key) {
      return;
    }
    initialCompileKeyRef.current = key;
    void compileSource(file.content);
  }, [compileSource, file?.content, file?.fullName, file?.path]);

  const handleDownload = useCallback(() => {
    const bytes = pdfBytesRef.current;
    if (!bytes || !file) {
      return;
    }

    const blob = new Blob([bytes.slice()], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = displayNameFromPath(file.path)
      .replace(/[^\w\-]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    anchor.href = url;
    anchor.download = `${safeName || "resume"}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [file]);

  const handleSaveToGitHub = useCallback(
    async (message: string) => {
      const current = getGitHubOpenFile();
      const content = draftRef.current ?? draftLatex ?? current?.content;
      if (!current || content === undefined) {
        return;
      }

      setSaving(true);
      setSaveError(null);

      try {
        const result = await commitFileContent({
          owner: current.owner,
          repo: current.repo,
          path: current.path,
          content,
          message,
          sha: current.sha,
          branch: current.branch,
        });

        updateGitHubOpenFile({ content, sha: result.sha });
        setDirty(false);
        setSaveOpen(false);
        setSaveNotice("Saved to GitHub");
        const shortSha = result.commitSha.slice(0, 7);
        showSaveToast(
          "success",
          `Saved to GitHub (${shortSha}). Commit created on ${current.fullName}.`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not save to GitHub.";
        setSaveError(message);
        showSaveToast("error", message);
      } finally {
        setSaving(false);
      }
    },
    [draftLatex, showSaveToast],
  );

  if (!isClient) {
    return (
      <Container className="py-12">
        <p className="text-sm text-ink-muted">Loading resume…</p>
      </Container>
    );
  }

  if (!file) {
    return (
      <Container className="py-12">
        <h1 className="text-xl font-semibold text-ink">No GitHub file open</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Open a .tex file from the GitHub segment on Resumes.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="secondary">Back to Resumes</Button>
        </Link>
      </Container>
    );
  }

  const title = displayNameFromPath(file.path);
  const defaultCommitMessage = `Update ${title} resume`;
  const saveStatusLabel = dirty
    ? "Unsaved changes"
    : saveNotice
      ? saveNotice
      : "Loaded from GitHub";
  const compileStatusLabel =
    compileStatus === "compiling"
      ? "Compiling..."
      : compileStatus === "success"
        ? "Compiled"
        : compileStatus === "failure"
          ? "Compilation failed"
          : null;
  const isCompiling = compileStatus === "compiling";
  const canDownload = compileStatus === "success" && pdfUrl !== null;

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-paper">
      <div className="border-b border-line bg-surface">
        <div className="flex flex-col gap-3 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/"
              className="text-xs text-ink-muted hover:text-ink hover:underline"
            >
              ← Resumes
            </Link>
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="truncate text-base font-semibold tracking-tight text-ink">
                {title}
              </h1>
              <p className="truncate text-xs text-ink-muted">
                {file.fullName}/{file.path}
              </p>
              <p
                className={`text-xs ${
                  saveNotice && !dirty
                    ? "text-success"
                    : dirty
                      ? "text-amber-700"
                      : "text-ink-muted"
                }`}
              >
                {saveStatusLabel}
              </p>
              {compileStatusLabel ? (
                <p
                  className={`text-xs ${
                    compileStatus === "failure"
                      ? "text-danger"
                      : compileStatus === "success"
                        ? "text-success"
                        : "text-ink-muted"
                  }`}
                >
                  {compileStatusLabel}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={autoCompile}
                onChange={(event) => setAutoCompileUser(event.target.checked)}
                className="size-4 rounded border-line-strong text-accent focus:ring-accent"
              />
              Auto compile
            </label>
            <Button
              onClick={() => {
                setSaveError(null);
                setSaveOpen(true);
              }}
            >
              Save to GitHub
            </Button>
          </div>
        </div>
        {saveToast ? (
          <div className="mx-4 mb-3">
            <Toast
              type={saveToast.type}
              message={saveToast.message}
              onDismiss={() => setSaveToast(null)}
            />
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-72 min-w-0 flex-1 flex-col border-b border-line lg:border-b-0 lg:border-r lg:border-line">
          <div className="flex h-9 shrink-0 items-center border-b border-line bg-surface px-3">
            <p className="text-xs font-medium text-ink-muted">Source</p>
            <p className="ml-2 truncate font-mono text-[11px] text-ink-faint">
              {file.path}
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <LatexEditor
              key={`${file.fullName}:${file.path}`}
              initialValue={file.content}
              onChange={handleChange}
              onSave={() => {
                setSaveError(null);
                setSaveOpen(true);
              }}
            />
          </div>
        </div>
        <div className="min-h-72 min-w-0 flex-1">
          <PdfPreview
            pdfUrl={pdfUrl}
            isCompiling={isCompiling}
            onCompile={handleCompile}
            onDownload={handleDownload}
            canDownload={canDownload}
          />
        </div>
      </div>

      <CompilationOutput
        status={compileStatus}
        log={compileLog}
        errors={compileErrors}
      />

      <Modal
        open={saveOpen}
        title="Save to GitHub"
        onClose={() => {
          if (!saving) {
            setSaveOpen(false);
          }
        }}
      >
        <SaveToGitHubForm
          defaultMessage={defaultCommitMessage}
          busy={saving}
          error={saveError}
          onSubmit={(message) => void handleSaveToGitHub(message)}
          onCancel={() => {
            if (!saving) {
              setSaveOpen(false);
            }
          }}
        />
      </Modal>
    </div>
  );
}
