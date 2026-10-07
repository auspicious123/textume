import { githubFetch } from "@/lib/github/client";
import type { GitHubCommitResult, GitHubFileContent } from "@/lib/github/types";

type ContentFileResponse = {
  type: "file";
  path: string;
  sha: string;
  content: string;
  encoding: string;
};

type ContentPutResponse = {
  content: { path: string; sha: string; html_url: string };
  commit: { sha: string; html_url: string };
};

function decodeBase64Utf8(value: string): string {
  const normalized = value.replace(/\n/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<GitHubFileContent> {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const data = await githubFetch<ContentFileResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}${query}`,
  );

  if (data.type !== "file") {
    throw new Error("Selected path is not a file.");
  }

  if (data.encoding !== "base64") {
    throw new Error("Unsupported file encoding from GitHub.");
  }

  return {
    path: data.path,
    sha: data.sha,
    content: decodeBase64Utf8(data.content),
    encoding: "utf-8",
  };
}

export async function commitFileContent(options: {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  sha?: string;
  branch?: string;
}): Promise<GitHubCommitResult> {
  const body: Record<string, string> = {
    message: options.message.trim() || "Update resume",
    content: encodeBase64Utf8(options.content),
  };

  if (options.sha) {
    body.sha = options.sha;
  }

  if (options.branch) {
    body.branch = options.branch;
  }

  const result = await githubFetch<ContentPutResponse>(
    `/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/contents/${options.path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );

  return {
    path: result.content.path,
    sha: result.content.sha,
    commitSha: result.commit.sha,
    htmlUrl: result.commit.html_url,
  };
}

export async function deleteFileContent(options: {
  owner: string;
  repo: string;
  path: string;
  message: string;
  sha: string;
  branch?: string;
}): Promise<void> {
  const body: Record<string, string> = {
    message: options.message.trim() || "Delete resume",
    sha: options.sha,
  };

  if (options.branch) {
    body.branch = options.branch;
  }

  await githubFetch(
    `/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/contents/${options.path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "DELETE",
      body: JSON.stringify(body),
    },
  );
}

export function displayNameFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.tex$/i, "") || base;
}
