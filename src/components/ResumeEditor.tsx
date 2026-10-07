"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CompilationOutput } from "@/components/CompilationOutput";
import { LatexEditor } from "@/components/LatexEditor";
import { PdfPreviewLazy as PdfPreview } from "@/components/PdfPreviewLazy";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useIsClient, useResume } from "@/hooks/useResumes";
import { formatUpdatedAt } from "@/lib/format-date";
import { compileLatex } from "@/lib/latex/compiler";
import { updateResume } from "@/lib/resume-storage";

type ResumeEditorProps = {
  resumeId: string;
};

type CompileStatus = "idle" | "compiling" | "success" | "failure";

const AUTO_COMPILE_DEBOUNCE_MS = 1500;
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

function subscribeDesktop(onStoreChange: () => void) {
  const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export function ResumeEditor({ resumeId }: ResumeEditorProps) {
  const resume = useResume(resumeId);
  const isClient = useIsClient();
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    () => false,
  );
  const [draftLatex, setDraftLatex] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "dirty"
  >("idle");
  const [compileStatus, setCompileStatus] = useState<CompileStatus>("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileLog, setCompileLog] = useState("");
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [autoCompileUser, setAutoCompileUser] = useState<boolean | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const autoCompileTimerRef = useRef<number | null>(null);
  const draftRef = useRef<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const autoCompileRef = useRef(false);
  const isCompilingRef = useRef(false);
  const pendingSourceRef = useRef<string | null>(null);

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

  const persist = useCallback(
    (value: string) => {
      const updated = updateResume(resumeId, { latex: value });
      if (updated) {
        draftRef.current = null;
        setSaveState("saved");
        return true;
      }
      return false;
    },
    [resumeId],
  );

  const saveNow = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const value = draftRef.current ?? draftLatex ?? resume?.latex;
    if (value === undefined) {
      return;
    }

    setSaveState("saving");
    persist(value);
  }, [draftLatex, persist, resume?.latex]);

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

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      if (autoCompileTimerRef.current !== null) {
        window.clearTimeout(autoCompileTimerRef.current);
      }
      if (draftRef.current !== null) {
        updateResume(resumeId, { latex: draftRef.current });
      }
      revokePdfUrl();
    };
  }, [resumeId, revokePdfUrl]);

  const handleChange = useCallback(
    (value: string) => {
      setDraftLatex(value);
      draftRef.current = value;
      setSaveState("dirty");

      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        setSaveState("saving");
        persist(value);
      }, 400);

      scheduleAutoCompile(value);
    },
    [persist, scheduleAutoCompile],
  );

  const handleCompile = useCallback(() => {
    const source = draftRef.current ?? draftLatex ?? resume?.latex;
    if (source === undefined) {
      return;
    }

    if (autoCompileTimerRef.current !== null) {
      window.clearTimeout(autoCompileTimerRef.current);
      autoCompileTimerRef.current = null;
    }

    void compileSource(source);
  }, [compileSource, draftLatex, resume?.latex]);

  const initialCompileKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!resume?.latex) {
      return;
    }
    if (initialCompileKeyRef.current === resume.id) {
      return;
    }
    initialCompileKeyRef.current = resume.id;
    void compileSource(resume.latex);
  }, [compileSource, resume?.id, resume?.latex]);

  const handleDownload = useCallback(() => {
    const bytes = pdfBytesRef.current;
    if (!bytes || !resume) {
      return;
    }

    const blob = new Blob([bytes.slice()], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = resume.name
      .trim()
      .replace(/[^\w\-]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    anchor.href = url;
    anchor.download = `${safeName || "resume"}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [resume]);

  if (!isClient) {
    return (
      <Container className="py-12">
        <p className="text-sm text-ink-muted">Loading resume…</p>
      </Container>
    );
  }

  if (!resume) {
    return (
      <Container className="py-12">
        <h1 className="text-xl font-semibold text-ink">Resume not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          This resume may have been deleted.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="secondary">Back to Resumes</Button>
        </Link>
      </Container>
    );
  }

  const saveStatusLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "dirty"
          ? "Unsaved changes"
          : `Updated ${formatUpdatedAt(resume.updatedAt)}`;

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
                {resume.name}
              </h1>
              <p
                className={`text-xs ${
                  saveState === "dirty"
                    ? "text-amber-700"
                    : saveState === "saved"
                      ? "text-success"
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
            <Button onClick={saveNow}>Save</Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-72 min-w-0 flex-1 flex-col border-b border-line lg:border-b-0 lg:border-r lg:border-line">
          <div className="flex h-9 shrink-0 items-center border-b border-line bg-surface px-3">
            <p className="text-xs font-medium text-ink-muted">Source</p>
            <p className="ml-2 truncate font-mono text-[11px] text-ink-faint">
              main.tex
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <LatexEditor
              key={resume.id}
              initialValue={resume.latex}
              onChange={handleChange}
              onSave={saveNow}
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
    </div>
  );
}
