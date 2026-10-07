import { BusyTexRunner, PdfLatex } from "texlyre-busytex";

const DEFAULT_BUSYTEX_BASE_PATH = "/core/busytex";
const SAME_ORIGIN_WORKER_PATH = "/api/busytex-bootstrap/busytex_worker.js";

export const TEXLIVE_REMOTE_ENDPOINT = "https://texlive2026.texlyre.org";

export type BusytexSource = "local" | "r2";

export function getBusytexSource(): BusytexSource {
  const raw = process.env.NEXT_PUBLIC_BUSYTEX_SOURCE?.trim().toLowerCase();
  if (raw === "r2" || raw === "cdn" || raw === "remote") {
    return "r2";
  }
  return "local";
}

export function getBusytexBasePath(): string {
  if (getBusytexSource() === "local") {
    return DEFAULT_BUSYTEX_BASE_PATH;
  }

  const fromEnv = process.env.NEXT_PUBLIC_BUSYTEX_BASE_URL?.trim();
  if (!fromEnv) {
    throw new Error(
      "NEXT_PUBLIC_BUSYTEX_SOURCE=r2 requires NEXT_PUBLIC_BUSYTEX_BASE_URL (R2/CDN URL, no trailing slash).",
    );
  }
  return fromEnv.replace(/\/+$/, "");
}

export function getTexliveDataPackages(): string[] {
  const base = getBusytexBasePath();
  return [
    `${base}/texlive-basic.js`,
    `${base}/texlive-recommended.js`,
    `${base}/texlive-extra.js`,
  ];
}

let runner: BusyTexRunner | null = null;
let pdfLatex: PdfLatex | null = null;
let initPromise: Promise<PdfLatex> | null = null;
let initializedBasePath: string | null = null;
let remoteWorkerPatchInstalled = false;

function isRemoteBase(base: string): boolean {
  return /^https?:\/\//i.test(base);
}

function engineAssetNames(engineMode: string): { jsFile: string; wasmFile: string } {
  if (engineMode === "combined") {
    return { jsFile: "busytex.js", wasmFile: "busytex.wasm" };
  }
  return { jsFile: `${engineMode}.js`, wasmFile: `${engineMode}.wasm` };
}

function biberAssetPaths(base: string) {
  return {
    biberJs: `${base}/biber.js`,
    biberWasm: `${base}/biber.wasm`,
    biberData: `${base}/biber.data`,
  };
}

function installRemoteWorkerPatch() {
  if (remoteWorkerPatchInstalled || typeof window === "undefined") {
    return;
  }
  remoteWorkerPatchInstalled = true;

  const proto = BusyTexRunner.prototype as unknown as {
    initializeWorker: (this: BusyTexRunner) => Promise<void>;
  };
  const original = proto.initializeWorker;

  proto.initializeWorker = function (this: BusyTexRunner) {
    const config = this.getConfig();
    if (!isRemoteBase(config.busytexBasePath)) {
      return original.call(this);
    }

    const self = this as unknown as {
      worker: Worker | null;
    };

    return new Promise<void>((resolve, reject) => {
      self.worker = new Worker(SAME_ORIGIN_WORKER_PATH);

      let settled = false;
      let timeout: ReturnType<typeof setTimeout>;

      const settle = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        callback();
      };

      const resetTimeout = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          settle(() =>
            reject(new Error("Timeout waiting for BusyTeX worker to initialize")),
          );
        }, 120000);
      };

      resetTimeout();

      self.worker.onmessage = (event: MessageEvent) => {
        const data = event.data as {
          initialized?: unknown;
          exception?: string;
          print?: string;
        };
        if (settled) {
          return;
        }
        if (data.initialized) {
          settle(() => resolve());
        } else if (data.exception) {
          settle(() => reject(new Error(data.exception)));
        } else if (data.print) {
          resetTimeout();
        }
      };

      self.worker.onerror = (error: ErrorEvent) => {
        error.preventDefault();
        settle(() =>
          reject(
            new Error(
              "BusyTeX worker failed to initialize (same-origin bootstrap). Check R2 CORS and NEXT_PUBLIC_BUSYTEX_BASE_URL.",
            ),
          ),
        );
      };

      const base = config.busytexBasePath;
      const { jsFile, wasmFile } = engineAssetNames(config.engineMode);
      const { biberJs, biberWasm, biberData } = biberAssetPaths(base);

      self.worker.postMessage({
        busytex_js: `${base}/${jsFile}`,
        busytex_wasm: `${base}/${wasmFile}`,
        biber_js: biberJs,
        biber_wasm: biberWasm,
        biber_data: biberData,
        preload_data_packages_js: config.preloadDataPackages,
        data_packages_js: config.catalogDataPackages,
        texmf_local: [],
        preload: true,
      });
    });
  };
}

export async function getPdfLatexEngine(): Promise<PdfLatex> {
  if (typeof window === "undefined") {
    throw new Error("LaTeX compilation can only run in the browser");
  }

  const basePath = getBusytexBasePath();
  if (pdfLatex && initializedBasePath === basePath) {
    return pdfLatex;
  }

  if (pdfLatex && initializedBasePath !== basePath) {
    resetPdfLatexEngine();
  }

  if (!initPromise) {
    const packages = getTexliveDataPackages();
    initPromise = (async () => {
      installRemoteWorkerPatch();

      const nextRunner = new BusyTexRunner({
        busytexBasePath: basePath,
        engineMode: "combined",
        preloadDataPackages: [packages[0]],
        verbose: false,
      });

      await nextRunner.initialize(true);
      runner = nextRunner;
      pdfLatex = new PdfLatex(nextRunner, false);
      initializedBasePath = basePath;
      return pdfLatex;
    })().catch((error) => {
      initPromise = null;
      runner = null;
      pdfLatex = null;
      initializedBasePath = null;
      throw error;
    });
  }

  return initPromise;
}

export function resetPdfLatexEngine(): void {
  if (runner) {
    runner.terminate();
  }
  runner = null;
  pdfLatex = null;
  initPromise = null;
  initializedBasePath = null;
}
