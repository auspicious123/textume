import { GitHubApiError, githubFetch } from "@/lib/github/client";
import {
  commitFileContent,
  deleteFileContent,
  getFileContent,
} from "@/lib/github/files";
import type { GitHubCommitResult, GitHubTexFile } from "@/lib/github/types";

export const RESUMES_DIR = "resumes";
const KEEP_FILE = `${RESUMES_DIR}/.gitkeep`;

type ContentEntry = {
  type: "file" | "dir" | "symlink" | "submodule";
  name: string;
  path: string;
  sha: string;
  size?: number;
};

export type ResumesFolderStatus =
  | { status: "missing" }
  | { status: "ready"; files: GitHubTexFile[] };

function contentsUrl(owner: string, repo: string, path: string, ref?: string) {
  const encoded = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encoded}${query}`;
}

export function toResumeFilename(input: string): string {
  let name = input.trim();
  if (name.toLowerCase().endsWith(".tex")) {
    name = name.slice(0, -4);
  }

  name = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!name) {
    throw new Error("Enter a valid resume filename.");
  }

  return `${name}.tex`;
}

export function resumeFilePath(filename: string): string {
  const base = filename.includes("/")
    ? (filename.split("/").pop() ?? filename)
    : filename;
  const safe = toResumeFilename(base);
  return `${RESUMES_DIR}/${safe}`;
}

export function resumeDisplayName(path: string): string {
  return path.split("/").pop() ?? path;
}

export async function getResumesFolderStatus(
  owner: string,
  repo: string,
  ref?: string,
): Promise<ResumesFolderStatus> {
  try {
    const data = await githubFetch<ContentEntry | ContentEntry[]>(
      contentsUrl(owner, repo, RESUMES_DIR, ref),
    );

    if (!Array.isArray(data)) {
      throw new Error(
        `"/${RESUMES_DIR}" exists but is not a directory. Choose another repository.`,
      );
    }

    const files = data
      .filter(
        (entry) =>
          entry.type === "file" && entry.name.toLowerCase().endsWith(".tex"),
      )
      .map((entry) => ({
        path: entry.path,
        name: entry.name,
        sha: entry.sha,
        size: entry.size ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { status: "ready", files };
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return { status: "missing" };
    }
    throw error;
  }
}

export async function createResumesFolder(options: {
  owner: string;
  repo: string;
  branch?: string;
}): Promise<GitHubCommitResult> {
  return commitFileContent({
    owner: options.owner,
    repo: options.repo,
    path: KEEP_FILE,
    content: "",
    message: "Create resumes directory",
    branch: options.branch,
  });
}

export async function createResumeInFolder(options: {
  owner: string;
  repo: string;
  name: string;
  content: string;
  branch?: string;
}): Promise<GitHubCommitResult> {
  const path = resumeFilePath(options.name);
  return commitFileContent({
    owner: options.owner,
    repo: options.repo,
    path,
    content: options.content,
    message: `Add ${resumeDisplayName(path)}`,
    branch: options.branch,
  });
}

export async function deleteResumeInFolder(options: {
  owner: string;
  repo: string;
  path: string;
  sha: string;
  branch?: string;
}): Promise<void> {
  const filename = resumeDisplayName(options.path);
  await deleteFileContent({
    owner: options.owner,
    repo: options.repo,
    path: options.path,
    sha: options.sha,
    message: `Delete ${filename}`,
    branch: options.branch,
  });
}

export async function renameResumeInFolder(options: {
  owner: string;
  repo: string;
  path: string;
  sha: string;
  newName: string;
  branch?: string;
}): Promise<GitHubCommitResult> {
  const nextPath = resumeFilePath(options.newName);
  if (nextPath === options.path) {
    throw new Error("Choose a different filename.");
  }

  const current = await getFileContent(
    options.owner,
    options.repo,
    options.path,
    options.branch,
  );

  const created = await commitFileContent({
    owner: options.owner,
    repo: options.repo,
    path: nextPath,
    content: current.content,
    message: `Rename ${resumeDisplayName(options.path)} to ${resumeDisplayName(nextPath)}`,
    branch: options.branch,
  });

  try {
    await deleteFileContent({
      owner: options.owner,
      repo: options.repo,
      path: options.path,
      sha: options.sha,
      message: `Remove ${resumeDisplayName(options.path)} after rename`,
      branch: options.branch,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Could not delete the old file.";
    throw new Error(
      `Created ${resumeDisplayName(nextPath)}, but failed to remove ${resumeDisplayName(options.path)}: ${detail}`,
    );
  }

  return created;
}
