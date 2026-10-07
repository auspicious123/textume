"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ResumeNameFormProps = {
  initialName?: string;
  submitLabel: string;
  suggestions?: readonly string[];
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

export function ResumeNameForm({
  initialName = "",
  submitLabel,
  suggestions,
  onSubmit,
  onCancel,
}: ResumeNameFormProps) {
  const [name, setName] = useState(initialName);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="resume-name"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Resume name
        </label>
        <Input
          id="resume-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Backend Engineer"
          autoFocus
          required
        />
        {suggestions && suggestions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setName(suggestion)}
                className="rounded-md border border-line px-2 py-1 text-xs text-ink-muted hover:bg-paper"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
