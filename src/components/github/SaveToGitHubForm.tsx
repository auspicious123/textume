"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type SaveToGitHubFormProps = {
  defaultMessage: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (message: string) => void;
  onCancel: () => void;
};

export function SaveToGitHubForm({
  defaultMessage,
  busy = false,
  error = null,
  onSubmit,
  onCancel,
}: SaveToGitHubFormProps) {
  const [message, setMessage] = useState(defaultMessage);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || busy) {
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="commit-message"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Commit message
        </label>
        <Input
          id="commit-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder='e.g. Update backend resume'
          autoFocus
          required
          disabled={busy}
        />
        <p className="mt-2 text-xs text-ink-muted">
          This creates a commit on the linked branch in your repository.
        </p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={!message.trim() || busy}>
          {busy ? "Saving…" : "Save to GitHub"}
        </Button>
      </div>
    </form>
  );
}
