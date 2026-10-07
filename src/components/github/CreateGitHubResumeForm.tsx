"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EXAMPLE_RESUME_NAMES } from "@/lib/default-template";
import { resumeFilePath, toResumeFilename } from "@/lib/github/resumes";
import {
  DEFAULT_TEMPLATE_ID,
  RESUME_TEMPLATES,
} from "@/lib/templates/catalog";

type CreateGitHubResumeFormProps = {
  busy?: boolean;
  error?: string | null;
  onSubmit: (name: string, templateId: string) => void;
  onCancel: () => void;
};

export function CreateGitHubResumeForm({
  busy = false,
  error = null,
  onSubmit,
  onCancel,
}: CreateGitHubResumeFormProps) {
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [name, setName] = useState("");

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
    onSubmit(trimmed, templateId);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium text-ink">
          Choose a template
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {RESUME_TEMPLATES.map((template) => {
            const selected = template.id === templateId;
            return (
              <button
                key={template.id}
                type="button"
                disabled={busy}
                onClick={() => setTemplateId(template.id)}
                className={`rounded-md border px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-surface text-ink hover:bg-paper"
                }`}
              >
                <span className="block text-sm font-semibold">
                  {template.name}
                </span>
                <span
                  className={`mt-1 block text-xs leading-snug ${
                    selected ? "text-white/80" : "text-ink-muted"
                  }`}
                >
                  {template.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="github-resume-name"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Filename
        </label>
        <Input
          id="github-resume-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. backend"
          autoFocus
          required
          disabled={busy}
        />
        <p className="mt-2 text-xs text-ink-muted">
          Saved as{" "}
          <span className="font-mono">
            {previewPath ?? "resumes/your-name.tex"}
          </span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_RESUME_NAMES.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={busy}
              onClick={() => setName(suggestion)}
              className="rounded-md border border-line px-2 py-1 text-xs text-ink-muted hover:bg-paper"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || busy}>
          {busy ? "Creating…" : "Create on GitHub"}
        </Button>
      </div>
    </form>
  );
}
