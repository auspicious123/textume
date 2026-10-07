"use client";

import Link from "next/link";
import { RowMenu } from "@/components/ui/RowMenu";
import { formatUpdatedAt } from "@/lib/format-date";
import type { Resume } from "@/types/resume";

type ResumeListItemProps = {
  resume: Resume;
  onRename: (resume: Resume) => void;
  onDuplicate: (resume: Resume) => void;
  onDelete: (resume: Resume) => void;
};

export function ResumeListItem({
  resume,
  onRename,
  onDuplicate,
  onDelete,
}: ResumeListItemProps) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Link
          href={`/resumes/${resume.id}`}
          className="text-sm font-medium text-ink hover:text-accent"
        >
          {resume.name}
        </Link>
        <p className="mt-0.5 text-xs text-ink-muted">
          Updated {formatUpdatedAt(resume.updatedAt)}
        </p>
      </div>
      <Link
        href={`/resumes/${resume.id}`}
        className="inline-flex h-8 items-center rounded-md border border-line-strong bg-surface px-3 text-xs font-medium text-ink hover:bg-paper"
      >
        Open
      </Link>
      <RowMenu
        items={[
          { label: "Rename", onSelect: () => onRename(resume) },
          { label: "Duplicate", onSelect: () => onDuplicate(resume) },
          {
            label: "Delete",
            onSelect: () => onDelete(resume),
            danger: true,
          },
        ]}
      />
    </li>
  );
}
