import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub client ID is not configured." },
      { status: 503 },
    );
  }

  let deviceCode = "";
  try {
    const body = (await request.json()) as { device_code?: string };
    deviceCode = body.device_code?.trim() ?? "";
  } catch {
    deviceCode = "";
  }

  if (!deviceCode) {
    return NextResponse.json(
      { error: "Missing device_code." },
      { status: 400 },
    );
  }

  const form = new URLSearchParams({
    client_id: clientId,
    device_code: deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });

  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (clientSecret) {
    form.set("client_secret", clientSecret);
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (typeof payload.error === "string") {
    const pending =
      payload.error === "authorization_pending" ||
      payload.error === "slow_down";
    return NextResponse.json(payload, {
      status: pending ? 200 : response.ok ? 400 : response.status,
    });
  }

  if (!response.ok) {
    const error =
      typeof payload.error_description === "string"
        ? payload.error_description
        : "Could not exchange GitHub device code.";
    return NextResponse.json({ error }, { status: response.status });
  }

  return NextResponse.json(payload);
}
