"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type PdfDoc = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getViewport: (params: { scale: number }) => {
      width: number;
      height: number;
    };
    render: (params: {
      canvas: HTMLCanvasElement;
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
      transform?: number[];
    }) => { promise: Promise<void> };
  }>;
  destroy: () => Promise<void>;
};

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

type PdfPreviewProps = {
  pdfUrl: string | null;
  isCompiling: boolean;
  onCompile: () => void;
  onDownload: () => void;
  canDownload: boolean;
};

const ZOOM_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const FIT_WIDTH = "fit-width" as const;

type ZoomMode = number | typeof FIT_WIDTH;

function nearestZoomStep(value: number): number {
  let best = ZOOM_STEPS[0];
  let bestDelta = Math.abs(value - best);
  for (const step of ZOOM_STEPS) {
    const delta = Math.abs(value - step);
    if (delta < bestDelta) {
      best = step;
      bestDelta = delta;
    }
  }
  return best;
}

function formatZoom(mode: ZoomMode, resolved: number): string {
  if (mode === FIT_WIDTH) {
    return "Fit width";
  }
  return `${Math.round(resolved * 100)}%`;
}

export function PdfPreview({
  pdfUrl,
  isCompiling,
  onCompile,
  onDownload,
  canDownload,
}: PdfPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoomMode, setZoomMode] = useState<ZoomMode>(FIT_WIDTH);
  const [resolvedScale, setResolvedScale] = useState(0.75);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(width);
    });
    observer.observe(container);
    setContainerWidth(container.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded: PdfDoc | null = null;

    setDoc(null);
    setPageCount(0);
    setPage(1);
    setPageInput("1");
    setLoadError(null);
    pageRefs.current.clear();

    if (!pdfUrl) {
      return;
    }

    void (async () => {
      try {
        const pdfjs = await loadPdfJs();
        if (cancelled) {
          return;
        }
        const task = pdfjs.getDocument(pdfUrl);
        loaded = (await task.promise) as unknown as PdfDoc;
        if (cancelled) {
          await loaded.destroy();
          return;
        }
        setDoc(loaded);
        setPageCount(loaded.numPages);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load PDF.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
  }, [pdfUrl]);

  const computeFitWidthScale = useCallback(
    async (pdf: PdfDoc, width: number) => {
      if (width <= 0) {
        return 0.75;
      }
      const first = await pdf.getPage(1);
      const viewport = first.getViewport({ scale: 1 });
      const available = Math.max(120, width - 48);
      return available / viewport.width;
    },
    [],
  );

  useLayoutEffect(() => {
    if (!doc || pageCount === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const scale =
        zoomMode === FIT_WIDTH
          ? await computeFitWidthScale(doc, containerWidth)
          : zoomMode;
      if (cancelled) {
        return;
      }
      setResolvedScale(scale);

      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const canvas = pageRefs.current.get(pageNumber);
        if (!canvas) {
          continue;
        }
        const pdfPage = await doc.getPage(pageNumber);
        if (cancelled) {
          return;
        }
        const viewport = pdfPage.getViewport({ scale });
        const context = canvas.getContext("2d");
        if (!context) {
          continue;
        }
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const transform =
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        await pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
          transform,
        }).promise;
        if (cancelled) {
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [computeFitWidthScale, containerWidth, doc, pageCount, zoomMode]);

  useEffect(() => {
    const canvas = pageRefs.current.get(page);
    canvas?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [page]);

  const goToPage = useCallback(
    (next: number) => {
      if (pageCount < 1) {
        return;
      }
      const clamped = Math.min(pageCount, Math.max(1, next));
      setPage(clamped);
      setPageInput(String(clamped));
    },
    [pageCount],
  );

  const zoomOut = () => {
    const current =
      zoomMode === FIT_WIDTH ? nearestZoomStep(resolvedScale) : zoomMode;
    const index = ZOOM_STEPS.findIndex((step) => step >= current - 0.001);
    const nextIndex = Math.max(
      0,
      (index === -1 ? ZOOM_STEPS.length - 1 : index) - 1,
    );
    setZoomMode(ZOOM_STEPS[nextIndex]);
  };

  const zoomIn = () => {
    const current =
      zoomMode === FIT_WIDTH ? nearestZoomStep(resolvedScale) : zoomMode;
    const index = ZOOM_STEPS.findIndex((step) => step > current + 0.001);
    setZoomMode(ZOOM_STEPS[index === -1 ? ZOOM_STEPS.length - 1 : index]);
  };

  const setCanvasRef = (pageNumber: number, node: HTMLCanvasElement | null) => {
    if (node) {
      pageRefs.current.set(pageNumber, node);
    } else {
      pageRefs.current.delete(pageNumber);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-pdf-toolbar">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-black/20 bg-pdf-toolbar px-2">
        <button
          type="button"
          onClick={onCompile}
          disabled={isCompiling}
          className="inline-flex h-7 items-center rounded bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCompiling ? "Compiling…" : "Recompile"}
        </button>

        <button
          type="button"
          onClick={onDownload}
          disabled={!canDownload || isCompiling}
          title="Download PDF"
          aria-label="Download PDF"
          className="inline-flex size-7 items-center justify-center rounded text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <DownloadIcon />
        </button>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            title="Previous page"
            aria-label="Previous page"
            className="inline-flex size-7 items-center justify-center rounded text-white/85 hover:bg-white/10 disabled:opacity-35"
          >
            <ChevronUpIcon />
          </button>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={pageCount === 0 || page >= pageCount}
            title="Next page"
            aria-label="Next page"
            className="inline-flex size-7 items-center justify-center rounded text-white/85 hover:bg-white/10 disabled:opacity-35"
          >
            <ChevronDownIcon />
          </button>

          <div className="mx-1 flex items-center gap-1 text-xs text-white/90">
            <input
              value={pageInput}
              onChange={(event) =>
                setPageInput(event.target.value.replace(/[^\d]/g, ""))
              }
              onBlur={() => {
                const parsed = Number.parseInt(pageInput, 10);
                if (Number.isFinite(parsed)) {
                  goToPage(parsed);
                } else {
                  setPageInput(String(page));
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  (event.target as HTMLInputElement).blur();
                }
              }}
              className="h-6 w-8 rounded border border-white/20 bg-[#333] text-center text-xs text-white outline-none focus:border-white/40"
              aria-label="Page number"
            />
            <span className="text-white/60">/</span>
            <span className="min-w-4 text-white/80">{pageCount || "–"}</span>
          </div>

          <button
            type="button"
            onClick={zoomOut}
            disabled={!doc}
            title="Zoom out"
            aria-label="Zoom out"
            className="inline-flex size-7 items-center justify-center rounded text-white/85 hover:bg-white/10 disabled:opacity-35"
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={!doc}
            title="Zoom in"
            aria-label="Zoom in"
            className="inline-flex size-7 items-center justify-center rounded text-white/85 hover:bg-white/10 disabled:opacity-35"
          >
            <PlusIcon />
          </button>

          <div className="relative ml-0.5">
            <button
              type="button"
              disabled={!doc}
              onClick={() => setZoomMenuOpen((open) => !open)}
              className="inline-flex h-7 min-w-[4.5rem] items-center justify-between gap-1 rounded border border-white/15 bg-[#333] px-2 text-xs text-white/90 hover:bg-[#3a3a3a] disabled:opacity-35"
            >
              <span>{formatZoom(zoomMode, resolvedScale)}</span>
              <ChevronDownIcon className="opacity-70" />
            </button>
            {zoomMenuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close zoom menu"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setZoomMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 min-w-[7rem] overflow-hidden rounded border border-[#2a2a2a] bg-[#333] py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs text-white/90 hover:bg-white/10"
                    onClick={() => {
                      setZoomMode(FIT_WIDTH);
                      setZoomMenuOpen(false);
                    }}
                  >
                    Fit width
                  </button>
                  {ZOOM_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-xs text-white/90 hover:bg-white/10"
                      onClick={() => {
                        setZoomMode(step);
                        setZoomMenuOpen(false);
                      }}
                    >
                      {Math.round(step * 100)}%
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full min-h-64 overflow-auto bg-pdf-workspace px-4 py-6"
        >
          {!pdfUrl ? (
            <div className="flex h-full items-center justify-center text-sm text-white/55">
              Click Recompile to preview the PDF.
            </div>
          ) : loadError ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-200">
              {loadError}
            </div>
          ) : pageCount > 0 ? (
            <div className="mx-auto flex w-fit flex-col items-center gap-6">
              {Array.from({ length: pageCount }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <canvas
                    key={pageNumber}
                    ref={(node) => setCanvasRef(pageNumber, node)}
                    className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
                    onClick={() => goToPage(pageNumber)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/55">
              Loading PDF…
            </div>
          )}
        </div>

        {isCompiling ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#525252]/40 text-sm font-medium text-white">
            Compiling…
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2v8m0 0L5.5 7.5M8 10l2.5-2.5M3 12.5h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5 7 5l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3.5 5.5 7 9l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7 3v8M3 7h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
