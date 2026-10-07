"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { resumeFilePath, toResumeFilename } from "@/lib/github/resumes";

type RenameGitHubResumeFormProps = {
  initialName: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

export function RenameGitHubResumeForm({
  initialName,
  busy = false,
  error = null,
  onSubmit,
  onCancel,
}: RenameGitHubResumeFormProps) {
  const withoutExt = initialName.replace(/\.tex$/i, "");
  const [name, setName] = useState(withoutExt);

  const previewPath = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return resumeFilePath(trimmed);
    } catch {
      return null;
    }
  }, [name]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) {
      return;
    }
    try {
      toResumeFilename(trimmed);
    } catch {
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="github-rename"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          New filename
        </label>
        <Input
          id="github-rename"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. fullstack"
          autoFocus
          required
          disabled={busy}
        />
        <p className="mt-2 text-xs text-ink-muted">
          Renames the file on GitHub to{" "}
          <span className="font-mono">
            {previewPath ?? "resumes/your-name.tex"}
          </span>
        </p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || busy}>
          {busy ? "Renaming…" : "Rename on GitHub"}
        </Button>
      </div>
    </form>
  );
}
