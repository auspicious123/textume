"use client";

import { RowMenu } from "@/components/ui/RowMenu";
import type { GitHubResumeItem } from "@/hooks/useGitHubResumes";

type GitHubResumeListItemProps = {
  resume: GitHubResumeItem;
  busy?: boolean;
  onOpen: (resume: GitHubResumeItem) => void;
  onRename: (resume: GitHubResumeItem) => void;
  onDelete: (resume: GitHubResumeItem) => void;
};

export function GitHubResumeListItem({
  resume,
  busy = false,
  onOpen,
  onRename,
  onDelete,
}: GitHubResumeListItemProps) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => onOpen(resume)}
          className="text-left text-sm font-medium text-ink hover:text-accent disabled:opacity-50"
        >
          {resume.name}
        </button>
        <p className="mt-0.5 font-mono text-xs text-ink-muted">{resume.path}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onOpen(resume)}
        className="inline-flex h-8 items-center rounded-md border border-line-strong bg-surface px-3 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
      >
        {busy ? "Opening…" : "Open"}
      </button>
      <RowMenu
        items={[
          {
            label: "Rename",
            onSelect: () => onRename(resume),
            disabled: busy,
          },
          {
            label: "Delete",
            onSelect: () => onDelete(resume),
            danger: true,
            disabled: busy,
          },
        ]}
      />
    </li>
  );
}
