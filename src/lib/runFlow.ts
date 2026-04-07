// Add to hermes.ts — gateway run endpoint

export interface RunResult {
  ok: boolean;
  jobId?: string;
  error?: string;
  output?: string;
}

export async function runFlow(
  settings: AppSettings,
  yaml: string,
  flowName: string
): Promise<RunResult> {
  // Method 1: try dedicated /v1/run endpoint (if gateway supports it)
  try {
    const res = await fetch(`/api/proxy?path=/v1/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-url": settings.gatewayUrl,
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify({ config: yaml, name: flowName }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, jobId: data.job_id ?? data.id, output: data.message };
    }
  } catch { /* fall through */ }

  // Method 2: write config file + run via terminal tool (agent does it)
  try {
    const safeName = flowName.toLowerCase().replace(/\s+/g, "-");
    const prompt = `Please do the following steps:
1. Write this YAML config to ~/.hermes/flows/${safeName}.yaml:

\`\`\`yaml
${yaml}
\`\`\`

2. Then run it with: hermes run --config ~/.hermes/flows/${safeName}.yaml --once

3. Report back what happened.`;

    const res = await fetch(`/api/proxy?path=/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-url": settings.gatewayUrl,
        "x-api-key": settings.apiKey,
      },
      body: JSON.stringify({
        model: settings.model || "hermes-agent",
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const output = data.choices?.[0]?.message?.content ?? "";
    return { ok: true, output };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function buildFlowFromNLP(
  settings: AppSettings,
  description: string
): Promise<string> {
  const prompt = `The user wants to create an automated workflow. Based on their description, generate a complete Hermes Agent YAML configuration.

User description: "${description}"

Generate a YAML config with:
- model: hermes-agent
- system_prompt: appropriate for the task
- tools: whichever are needed (web_search, terminal, file_ops, browser, github, etc.)
- gateway.cron if it should run on a schedule, or gateway.api if triggered by webhook
- delivery.telegram or delivery.discord if output should be sent somewhere
- memory.provider: fts5 if it should remember things

Return ONLY the YAML, no explanation, no markdown code fences. Start with the comment line.`;

  const res = await fetch(`/api/proxy?path=/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gateway-url": settings.gatewayUrl,
      "x-api-key": settings.apiKey,
    },
    body: JSON.stringify({
      model: settings.model || "hermes-agent",
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
