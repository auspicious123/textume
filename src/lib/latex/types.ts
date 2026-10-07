export type LatexProjectFile = {
  path: string;
  content: string | Uint8Array;
};

export type CompileLatexInput = {
  mainFile?: string;
  source: string;
  files?: LatexProjectFile[];
};

export type CompileLatexResult = {
  ok: boolean;
  pdf?: Uint8Array;
  log: string;
  status: number;
  errors: string[];
};
