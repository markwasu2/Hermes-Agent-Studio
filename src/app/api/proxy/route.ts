import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) { return proxy(req); }
export async function POST(req: NextRequest) { return proxy(req); }
export async function DELETE(req: NextRequest) { return proxy(req); }
export async function PUT(req: NextRequest) { return proxy(req); }

async function proxy(req: NextRequest): Promise<NextResponse> {
  // Gateway URL: from header, env, or default
  const gatewayUrl =
    req.headers.get("x-gateway-url") ??
    process.env.HERMES_GATEWAY_URL ??
    "http://localhost:8642";

  // API key: from Authorization Bearer OR x-api-key header
  const authHeader = req.headers.get("authorization") ?? req.headers.get("x-api-key") ?? "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "");

  // Path to forward
  const path = req.nextUrl.searchParams.get("path") ?? "/health";
  const url = `${gatewayUrl.replace(/\/$/, "")}${path}`;

  const upstreamHeaders: Record<string, string> = {};
  if (apiKey) upstreamHeaders["Authorization"] = `Bearer ${apiKey}`;

  try {
    let body: string | null = null;
    let isStreaming = false;

    if (req.method === "POST" || req.method === "PUT") {
      body = await req.text();
      upstreamHeaders["Content-Type"] = "application/json";

      // Check if this is a streaming request (chat with stream:true)
      try {
        const parsed = JSON.parse(body);
        isStreaming = parsed.stream === true;
      } catch { /* not JSON */ }
    }

    const upstream = await fetch(url, {
      method: req.method,
      headers: upstreamHeaders,
      body: body ?? undefined,
      // @ts-expect-error node fetch
      duplex: "half",
      signal: AbortSignal.timeout(30_000),
    });

    // Stream back SSE responses
    if (isStreaming && upstream.body) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });

  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "proxy error" },
      { status: 502 }
    );
  }
}
