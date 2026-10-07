"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type CompilationOutputProps = {
  log: string;
  errors: string[];
  status: "idle" | "compiling" | "success" | "failure";
};

const MIN_HEIGHT = 96;
const MAX_HEIGHT = 480;
const DEFAULT_HEIGHT = 144;
const HEADER_HEIGHT = 36;

export function CompilationOutput({
  log,
  errors,
  status,
}: CompilationOutputProps) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [dragging, setDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(DEFAULT_HEIGHT);
  const hasErrors = status === "failure" && errors.length > 0;

  useEffect(() => {
    if (status === "failure") {
      setOpen(true);
    }
  }, [status]);

  const onPointerMove = useCallback((event: PointerEvent) => {
    const delta = dragStartYRef.current - event.clientY;
    const next = Math.min(
      MAX_HEIGHT,
      Math.max(MIN_HEIGHT, dragStartHeightRef.current + delta),
    );
    setHeight(next);
  }, []);

  const stopDragging = useCallback(() => {
    setDragging(false);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
    window.removeEventListener("pointercancel", stopDragging);
  }, [onPointerMove]);

  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!open) {
      setOpen(true);
    }
    event.preventDefault();
    dragStartYRef.current = event.clientY;
    dragStartHeightRef.current = open ? height : DEFAULT_HEIGHT;
    setDragging(true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [onPointerMove, stopDragging]);

  return (
    <section
      className="relative flex shrink-0 flex-col border-t border-line bg-surface"
      style={{ height: open ? height : HEADER_HEIGHT }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize logs"
        aria-valuemin={MIN_HEIGHT}
        aria-valuemax={MAX_HEIGHT}
        aria-valuenow={height}
        onPointerDown={startDragging}
        className={`absolute inset-x-0 top-0 z-10 flex h-3 -translate-y-1/2 cursor-ns-resize items-center justify-center ${
          dragging ? "bg-accent/15" : "hover:bg-paper"
        }`}
      >
        <span className="inline-flex items-center text-ink-faint">
          <ResizeHandleIcon />
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-9 w-full shrink-0 items-center gap-2 px-3 text-left hover:bg-paper"
      >
        <span className="inline-flex size-4 items-center justify-center text-ink-muted">
          {open ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Logs &amp; output
        </h2>
        <p
          className={`ml-auto text-xs ${
            status === "failure"
              ? "text-danger"
              : status === "success"
                ? "text-success"
                : "text-ink-muted"
          }`}
        >
          {status === "idle"
            ? "Idle"
            : status === "compiling"
              ? "Compiling..."
              : status === "success"
                ? "Compiled"
                : "Compilation failed"}
        </p>
      </button>

      {open ? (
        <div className="min-h-0 flex-1 overflow-auto border-t border-line px-4 py-3">
          {status === "idle" ? (
            <p className="text-xs text-ink-faint">
              Compilation messages will appear here.
            </p>
          ) : null}

          {hasErrors ? (
            <ul className="mb-3 space-y-2 text-xs text-danger">
              {errors.map((error, index) => (
                <li
                  key={`${index}:${error.slice(0, 80)}`}
                  className="whitespace-pre-wrap font-mono leading-relaxed"
                >
                  {error}
                </li>
              ))}
            </ul>
          ) : null}

          {log ? (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-muted">
              {log}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ResizeHandleIcon() {
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
      <path
        d="M9 1.25 6.75 3.5h4.5L9 1.25ZM9 8.75 11.25 6.5h-4.5L9 8.75Z"
        fill="currentColor"
      />
      <path
        d="M3 5h12"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 7.5 6 4l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
