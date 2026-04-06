import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function POST(req: NextRequest) {
  return proxy(req);
}

export async function DELETE(req: NextRequest) {
  return proxy(req);
}

async function proxy(req: NextRequest): Promise<NextResponse> {
  const gatewayUrl = req.headers.get("x-gateway-url") ?? "http://localhost:8642";
  const apiKey = req.headers.get("x-api-key") ?? "";
  const path = req.nextUrl.searchParams.get("path") ?? "/health";

  const url = `${gatewayUrl.replace(/\/$/, "")}${path}`;

  const upstreamHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) upstreamHeaders["Authorization"] = `Bearer ${apiKey}`;

  try {
    const isStreaming =
      req.method === "POST" &&
      path.includes("chat/completions");

    let body: BodyInit | null = null;
    if (req.method === "POST") {
      body = await req.text();
    }

    const upstream = await fetch(url, {
      method: req.method,
      headers: upstreamHeaders,
      body: body ?? undefined,
      // @ts-expect-error node fetch duplex
      duplex: "half",
    });

    if (isStreaming && upstream.body) {
      // Stream response back
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const responseText = await upstream.text();
    return new NextResponse(responseText, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "proxy error" },
      { status: 502 }
    );
  }
}
