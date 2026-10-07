import {
  getPdfLatexEngine,
  getTexliveDataPackages,
  resetPdfLatexEngine,
  TEXLIVE_REMOTE_ENDPOINT,
} from "@/lib/latex/busytex-engine";
import { extractLatexErrors } from "@/lib/latex/log";
import type { CompileLatexInput, CompileLatexResult } from "@/lib/latex/types";

let compileQueue: Promise<unknown> = Promise.resolve();

function isFatalEngineError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /worker|terminated|busytex|failed to initialize|networkerror/i.test(
    message,
  );
}

async function compileLatexUnlocked(
  input: CompileLatexInput,
  allowRetry: boolean,
): Promise<CompileLatexResult> {
  const mainFile = input.mainFile ?? "main.tex";

  try {
    const engine = await getPdfLatexEngine();
    const result = await engine.compile({
      input: input.source,
      mainTexPath: mainFile,
      additionalFiles: input.files,
      verbose: "info",
      dataPackagesJs: getTexliveDataPackages(),
      remoteEndpoint: TEXLIVE_REMOTE_ENDPOINT,
    });

    const log = result.log || result.logs.map((entry) => entry.log).join("\n");
    const errors = extractLatexErrors(log);
    const ok = result.success && result.pdf instanceof Uint8Array;

    return {
      ok,
      pdf: ok ? result.pdf : undefined,
      log,
      status: result.exitCode,
      errors:
        errors.length > 0
          ? errors
          : ok
            ? []
            : [`Compilation failed with exit code ${result.exitCode}.`],
    };
  } catch (error) {
    if (allowRetry && isFatalEngineError(error)) {
      resetPdfLatexEngine();
      return compileLatexUnlocked(input, false);
    }
    throw error;
  }
}

export async function compileLatex(
  input: CompileLatexInput,
): Promise<CompileLatexResult> {
  const run = compileQueue.then(() => compileLatexUnlocked(input, true));
  compileQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
