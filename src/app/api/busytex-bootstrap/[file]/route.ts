import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "busytex_worker.js",
  "busytex_biber.js",
  "busytex_pipeline.js",
]);

function getR2Base(): string | null {
  const raw = process.env.NEXT_PUBLIC_BUSYTEX_BASE_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/+$/, "");
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  if (!ALLOWED.has(file)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base = getR2Base();
  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_BUSYTEX_BASE_URL is not set" },
      { status: 500 },
    );
  }

  const upstream = await fetch(`${base}/${file}`, {
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream ${upstream.status} for ${file}` },
      { status: upstream.status },
    );
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
