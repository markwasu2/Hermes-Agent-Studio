# Hermes Studio

A clean web dashboard for [Hermes Agent](https://github.com/NousResearch/hermes-agent) by Nous Research — inspired by OpenClaw Studio, rebuilt for Hermes.

**Chat · Sessions · Memory · Skills · Cron — all from one place, no terminal required.**

![Hermes Studio](.github/preview.png)

---

## What it is

Hermes Studio is a Next.js 15 web app that connects to the Hermes Agent API server (port 8642) and gives you a GUI for everything you'd otherwise do in the terminal.

| Panel | What it does |
|-------|-------------|
| **Chat** | Streaming chat with SSE — tool calls show inline, per-session context |
| **Sessions** | Create and manage named conversations (uses Hermes `/v1/responses` `conversation` param) |
| **Memory** | Browse and search agent memory — queries the agent directly |
| **Skills** | View installed skills, browse the [agentskills.io](https://agentskills.io) hub |
| **Cron** | View and create scheduled jobs in natural language |

---

## Prerequisites

1. **Hermes Agent installed** — [install guide](https://hermes-agent.nousresearch.com/docs/getting-started/installation)
2. **API server enabled** in `~/.hermes/.env`:

```
API_SERVER_ENABLED=true
API_SERVER_KEY=change-me-pick-a-key
API_SERVER_CORS_ORIGINS=http://localhost:3000
```

3. **Gateway running:**

```bash
hermes gateway
# → [API Server] API server listening on http://127.0.0.1:8642
```

---

## Quick Start

```bash
git clone https://github.com/yourname/hermes-studio.git
cd hermes-studio
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Settings**, enter your gateway URL and API key.

### Environment variables (optional)

```bash
# .env.local
NEXT_PUBLIC_GATEWAY_URL=http://localhost:8642
NEXT_PUBLIC_API_KEY=change-me-pick-a-key
```

If you set these, Studio auto-connects on first load.

---

## Remote / VPS setup

Same as local but point Studio at your remote gateway.

### Recommended: Tailscale

```bash
# On your VPS (gateway host):
tailscale serve --yes --bg --https 443 http://127.0.0.1:8642

# In Studio Settings:
# Gateway URL: https://<your-host>.ts.net
# API Key: your API_SERVER_KEY
```

### SSH tunnel

```bash
ssh -L 8642:127.0.0.1:8642 user@your-vps
# Then use http://localhost:8642 as gateway URL
```

---

## Architecture

```
Browser → Next.js (port 3000)
              ↓
         /api/proxy      ← strips CORS, forwards auth
              ↓
    Hermes Gateway (port 8642)
    POST /v1/chat/completions   ← SSE streaming chat
    GET  /v1/models
    GET  /health
```

Studio proxies all Hermes API calls through `/api/proxy` to avoid CORS issues when the gateway is on localhost.

---

## How it differs from OpenClaw Studio

| | OpenClaw Studio | Hermes Studio |
|--|---|---|
| Transport | WebSocket | HTTP + SSE |
| Gateway port | 18789 | 8642 |
| Protocol | OpenClaw WS protocol | OpenAI-compatible REST |
| Auth | Token header | Bearer token |
| Sessions | Agent-managed | Named conversation IDs |

---

## Coming soon

- [ ] File upload to agent
- [ ] Voice mode (TTS/STT via Hermes voice API)
- [ ] Live terminal output viewer
- [ ] MCP server management
- [ ] Dark/light theme toggle

---

## License

MIT — fork it, adapt it, ship it.
