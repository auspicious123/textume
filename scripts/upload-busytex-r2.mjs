#!/usr/bin/env node

import { createReadStream, readFileSync, existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const localDir = path.join(root, "public/core/busytex");
const WRANGLER_MAX_BYTES = 300 * 1024 * 1024;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const bucket = process.env.R2_BUCKET?.trim() || process.argv[2]?.trim();
const prefix = (process.env.R2_PREFIX?.trim() || "busytex").replace(/^\/+|\/+$/g, "");
const accountId = process.env.R2_ACCOUNT_ID?.trim() || process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey =
  process.env.R2_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();

if (!bucket) {
  console.error(`Usage:
  Fill R2_* in .env (see .env.example), then:
    npm run busytex:upload-r2

  Or: R2_BUCKET=textume-busytex npm run busytex:upload-r2

Files ≤ 300 MiB: Wrangler (npx wrangler login).
Files > 300 MiB: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.
`);
  process.exit(1);
}

const hasS3 = Boolean(accountId && accessKeyId && secretAccessKey);

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

function contentTypeFor(name) {
  if (name.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (name.endsWith(".wasm")) {
    return "application/wasm";
  }
  if (name.endsWith(".data")) {
    return "application/octet-stream";
  }
  if (name.endsWith(".txt") || name.endsWith(".profile") || name.endsWith(".cnf")) {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}

async function uploadViaWrangler(localPath, key, contentType) {
  await run("npx", [
    "wrangler",
    "r2",
    "object",
    "put",
    `${bucket}/${key}`,
    "--file",
    localPath,
    "--content-type",
    contentType,
    "--remote",
  ]);
}

async function uploadViaS3(localPath, key, size, contentType) {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const { Upload } = await import("@aws-sdk/lib-storage");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: createReadStream(localPath),
      ContentLength: size,
      ContentType: contentType,
    },
    partSize: 32 * 1024 * 1024,
    queueSize: 4,
    leavePartsOnError: false,
  });

  upload.on("httpUploadProgress", (p) => {
    if (p.loaded == null) {
      return;
    }
    if (p.total) {
      const pct = Math.min(100, Math.round((100 * p.loaded) / p.total));
      process.stdout.write(`\r   multipart ${pct}%`);
    } else {
      process.stdout.write(`\r   uploaded ${Math.round(p.loaded / (1024 * 1024))} MiB`);
    }
  });

  await upload.done();
  process.stdout.write("\n");
}

const entries = await readdir(localDir);
const files = entries.filter((name) => !name.startsWith(".")).sort();

if (files.length === 0) {
  console.error(`No files in ${localDir}. Run: npm run latex:assets`);
  process.exit(1);
}

const onlyArgIdx = process.argv.indexOf("--only");
const onlyNames =
  onlyArgIdx >= 0
    ? process.argv.slice(onlyArgIdx + 1).filter((a) => !a.startsWith("-"))
    : process.env.R2_UPLOAD_ONLY?.split(/[\s,]+/).filter(Boolean) || [];

const selected =
  onlyNames.length > 0
    ? files.filter((name) => onlyNames.includes(name))
    : files;

if (onlyNames.length > 0 && selected.length === 0) {
  console.error(`No matching files for --only ${onlyNames.join(" ")}`);
  process.exit(1);
}

console.log(`Uploading ${selected.length} files from ${localDir}`);
console.log(`→ r2://${bucket}/${prefix}/…`);
console.log(
  hasS3
    ? "S3 credentials found — using S3 API (multipart for large files).\n"
    : "No R2 S3 credentials — Wrangler only (fails for files > 300 MiB).\n",
);

for (const name of selected) {
  const localPath = path.join(localDir, name);
  const key = `${prefix}/${name}`;
  const { size } = await stat(localPath);
  const mib = (size / (1024 * 1024)).toFixed(1);

  const contentType = contentTypeFor(name);

  if (hasS3) {
    console.log(`→ ${key} (${mib} MiB, S3, ${contentType})`);
    await uploadViaS3(localPath, key, size, contentType);
    continue;
  }

  if (size > WRANGLER_MAX_BYTES) {
    console.error(`
Cannot upload ${name} (${mib} MiB).
Wrangler and the dashboard both cap at 300 MiB.

Set in .env (see .env.example):
  R2_ACCOUNT_ID=<from R2 overview>
  R2_ACCESS_KEY_ID=...
  R2_SECRET_ACCESS_KEY=...

Then: npm run busytex:upload-r2 -- --only texlive-extra.data
`);
    process.exit(1);
  }

  console.log(`→ ${key} (${mib} MiB, wrangler, ${contentType})`);
  await uploadViaWrangler(localPath, key, contentType);
}

console.log(`
Done.

Set in .env / Vercel:
  NEXT_PUBLIC_BUSYTEX_SOURCE=r2
  NEXT_PUBLIC_BUSYTEX_BASE_URL=https://<your-public-r2-host>/${prefix}

Verify:
  curl -I "$NEXT_PUBLIC_BUSYTEX_BASE_URL/texlive-basic.js"
  curl -I "$NEXT_PUBLIC_BUSYTEX_BASE_URL/texlive-extra.data"
`);
