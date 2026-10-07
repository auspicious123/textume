export type GitHubUser = {
  login: string;
  avatarUrl: string | null;
};

export type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  htmlUrl: string;
};

export type GitHubTexFile = {
  path: string;
  name: string;
  sha: string;
  size: number;
};

export type GitHubFileContent = {
  path: string;
  sha: string;
  content: string;
  encoding: "utf-8";
};

export type GitHubCommitResult = {
  path: string;
  sha: string;
  commitSha: string;
  htmlUrl: string;
};

export type GitHubOpenFile = {
  owner: string;
  repo: string;
  path: string;
  sha: string;
  content: string;
  branch: string;
  fullName: string;
};

export type DeviceAuthorization = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
};

export type DeviceTokenSuccess = {
  accessToken: string;
  tokenType: string;
  scope: string;
};

export type DeviceTokenPending = {
  status: "pending" | "slow_down";
  interval?: number;
};

export type DeviceTokenResult = DeviceTokenSuccess | DeviceTokenPending;
