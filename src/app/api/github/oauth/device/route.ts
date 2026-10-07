import { NextResponse } from "next/server";
import { GITHUB_OAUTH_SCOPE } from "@/lib/github/config";

export async function POST() {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub client ID is not configured." },
      { status: 503 },
    );
  }

  const form = new URLSearchParams({
    client_id: clientId,
    scope: GITHUB_OAUTH_SCOPE,
  });

  const response = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const error =
      typeof payload.error_description === "string"
        ? payload.error_description
        : typeof payload.error === "string"
          ? payload.error
          : "Could not start GitHub device authorization.";
    return NextResponse.json({ error }, { status: response.status });
  }

  return NextResponse.json(payload);
}
