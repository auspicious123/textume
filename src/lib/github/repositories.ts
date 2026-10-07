import { githubFetch } from "@/lib/github/client";
import type { GitHubRepository } from "@/lib/github/types";

type RepoApiItem = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  html_url: string;
  owner: { login: string };
};

function mapRepository(item: RepoApiItem): GitHubRepository {
  return {
    id: item.id,
    name: item.name,
    fullName: item.full_name,
    owner: item.owner.login,
    private: item.private,
    defaultBranch: item.default_branch,
    description: item.description,
    htmlUrl: item.html_url,
  };
}

export async function listRepositories(): Promise<GitHubRepository[]> {
  const results: GitHubRepository[] = [];
  let page = 1;

  while (page <= 10) {
    const batch = await githubFetch<RepoApiItem[]>(
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
    );

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    results.push(...batch.map(mapRepository));

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return results;
}

export async function createRepository(options: {
  name: string;
  description?: string;
  isPrivate?: boolean;
}): Promise<GitHubRepository> {
  const name = options.name.trim();
  if (!name) {
    throw new Error("Repository name is required.");
  }

  const created = await githubFetch<RepoApiItem>("/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name,
      description: options.description?.trim() || undefined,
      private: options.isPrivate ?? true,
      auto_init: true,
    }),
  });

  return mapRepository(created);
}
