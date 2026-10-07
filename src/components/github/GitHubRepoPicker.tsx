"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createRepository,
  listRepositories,
} from "@/lib/github/repositories";
import type { GitHubRepository } from "@/lib/github/types";

type GitHubRepoPickerProps = {
  onSelect: (repo: GitHubRepository) => void;
  onCancel: () => void;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; repos: GitHubRepository[] }
  | { status: "error"; message: string };

function sanitizeRepoName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\.+$/g, "")
    .slice(0, 100);
}

export function GitHubRepoPicker({ onSelect, onCancel }: GitHubRepoPickerProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState<"list" | "create">("list");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listRepositories()
      .then((repos) => {
        if (cancelled) {
          return;
        }
        setLoadState({ status: "ready", repos });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setLoadState({
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "Could not load repositories.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRepos = useMemo(() => {
    const repos = loadState.status === "ready" ? loadState.repos : [];
    const q = filter.trim().toLowerCase();
    if (!q) {
      return repos;
    }
    return repos.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(q) ||
        repo.description?.toLowerCase().includes(q),
    );
  }, [filter, loadState]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const name = sanitizeRepoName(newName);
    if (!name) {
      setCreateError("Enter a valid repository name.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const repo = await createRepository({
        name,
        description: newDescription,
        isPrivate,
      });
      onSelect(repo);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Could not create repository.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (mode === "create") {
    return (
      <form onSubmit={(event) => void handleCreate(event)} className="space-y-4">
        <p className="text-sm text-ink-muted">
          Create a new GitHub repository under your account. Textume will use it
          for resumes in a{" "}
          <code className="rounded bg-paper px-1 py-0.5 text-xs">/resumes</code>{" "}
          folder.
        </p>
        <div>
          <label
            htmlFor="new-repo-name"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Repository name
          </label>
          <Input
            id="new-repo-name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="my-resumes"
            autoFocus
            required
          />
          {newName.trim() ? (
            <p className="mt-1 text-xs text-ink-muted">
              Will create as{" "}
              <span className="font-mono">{sanitizeRepoName(newName) || "…"}</span>
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="new-repo-description"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Description (optional)
          </label>
          <Input
            id="new-repo-description"
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="LaTeX resumes"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
            className="size-4 rounded border-line-strong text-ink focus:ring-accent"
          />
          Private repository
        </label>
        {createError ? (
          <p className="text-sm text-danger" role="alert">
            {createError}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setMode("list");
              setCreateError(null);
            }}
            disabled={creating}
          >
            Back
          </Button>
          <Button type="submit" disabled={creating || !sanitizeRepoName(newName)}>
            {creating ? "Creating…" : "Create repository"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Choose a repository to use as your GitHub resume source. You can change
        it later.
      </p>
      <Input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter repositories…"
        aria-label="Filter repositories"
      />
      <div className="max-h-80 overflow-y-auto rounded-md border border-line">
        {loadState.status === "loading" ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">
            Loading repositories…
          </p>
        ) : loadState.status === "error" ? (
          <p className="px-4 py-8 text-center text-sm text-danger">
            {loadState.message}
          </p>
        ) : filteredRepos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">
            No repositories found.
          </p>
        ) : (
          <ul>
            {filteredRepos.map((repo) => (
              <li key={repo.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(repo)}
                  className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-paper"
                >
                  <span className="text-sm font-medium text-ink">
                    {repo.fullName}
                    {repo.private ? (
                      <span className="ml-2 text-xs font-normal text-ink-muted">
                        private
                      </span>
                    ) : null}
                  </span>
                  {repo.description ? (
                    <span className="line-clamp-1 text-xs text-ink-muted">
                      {repo.description}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={() => setMode("create")}>
          Create new repository
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
