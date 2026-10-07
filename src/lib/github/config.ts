export const GITHUB_OAUTH_SCOPE = "repo";

export const GITHUB_PERMISSIONS_EXPLANATION = [
  "Textume asks for the repo scope so it can read your repositories, open .tex files, and create commits when you save.",
  "This includes private repositories you can access. Textume never creates issues, pull requests, or GitHub Actions.",
  "You can disconnect at any time. Your local resumes keep working without GitHub.",
] as const;

export function getGitHubClientId(): string | null {
  const value = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID?.trim();
  return value ? value : null;
}

export function isGitHubConfigured(): boolean {
  return getGitHubClientId() !== null;
}
