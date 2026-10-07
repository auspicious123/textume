"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  defaultResumeNameFromFile,
  isTexFile,
  readTexFile,
} from "@/lib/import-tex";

type ImportTexPanelProps = {
  onImport: (name: string, latex: string) => void;
  onCancel: () => void;
};

type PendingImport = {
  fileName: string;
  latex: string;
  defaultName: string;
};

export function ImportTexPanel({ onImport, onCancel }: ImportTexPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);

  async function loadFile(file: File) {
    setError(null);

    if (!isTexFile(file)) {
      setError("Only .tex or LaTeX .md files are supported.");
      setPending(null);
      return;
    }

    setReading(true);
    try {
      const latex = await readTexFile(file);
      const defaultName = defaultResumeNameFromFile(file);
      setPending({
        fileName: file.name,
        latex,
        defaultName,
      });
      setName(defaultName);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not read that file.",
      );
      setPending(null);
    } finally {
      setReading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }
    void loadFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!pending) {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    onImport(trimmed, pending.latex);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={handleDrop}
        className={`rounded-lg border border-dashed px-4 py-8 text-center ${
          dragging
            ? "border-ink bg-paper"
            : "border-line-strong bg-white"
        }`}
      >
        <p className="text-sm text-ink">
          {reading
            ? "Reading file…"
            : "Drop a .tex or LaTeX .md file here, or choose one from your computer."}
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={reading}
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".tex,.md,text/x-tex,application/x-tex,text/markdown"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {pending ? (
        <div className="space-y-3">
          <p className="text-xs text-ink-muted">
            Selected: <span className="font-medium text-ink">{pending.fileName}</span>
          </p>
          <div>
            <label
              htmlFor="import-resume-name"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Resume name
            </label>
            <Input
              id="import-resume-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              required
            />
          </div>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!pending || !name.trim() || reading}>
          Import Resume
        </Button>
      </div>
    </form>
  );
}
