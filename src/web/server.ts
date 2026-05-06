import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Runtime, RuntimeEvent } from "../engine/runtime.js";
import { readMd, readRelationship, listSessionDays, readSessionLog, sessionDate } from "../storage/md.js";
import { readCalendar } from "../engine/calendar.js";
import type { ProfileConfig } from "../types.js";
import { getUI } from "./ui.js";

function cors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function text(res: ServerResponse, content: string): void {
  cors(res);
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(content);
}

function checkAuth(req: IncomingMessage, token?: string): boolean {
  if (!token) return true;
  const url = new URL(req.url ?? "/", "http://localhost");
  const t = url.searchParams.get("token") ?? req.headers.authorization?.replace("Bearer ", "");
  return t === token;
}

async function executeCommand(runtime: Runtime, line: string): Promise<string> {
  const parts = line.slice(1).split(" ");
  const head = parts[0];
  const rest = parts.slice(1);
  switch (head) {
    case "status":       return runtime.cmdStatus();
    case "reset":        return runtime.cmdReset();
    case "stage":        return runtime.cmdSetStage(rest.join(" "));
    case "wake":         return runtime.cmdWake(rest[0]);
    case "debug":        return runtime.cmdDebug(rest[0]);
    case "why":          return runtime.cmdWhy(rest[0]);
    case "amnesia":      return runtime.cmdAmnesia(rest[0] ?? "", rest[1]);
    case "block":        return runtime.cmdBlock(rest[0]);
    case "unblock":      return runtime.cmdUnblock(rest[0]);
    case "read":         return runtime.cmdRead(rest[0]);
    case "sticker":      return runtime.cmdSticker(rest[0]);
    case "clear-chat":   return runtime.cmdClearChat(rest.find(x => !x.startsWith("--")), rest.includes("--revoke"));
    case "report-spam":  return runtime.cmdReportSpam(rest[0]);
    case "delete-last":  return runtime.cmdDeleteLast(rest.find(x => !x.startsWith("--")), !rest.includes("--local"));
    case "edit-last":    return runtime.cmdEditLast(rest.join(" "));
    case "edit":         return runtime.cmdEdit(rest[0], ...rest.slice(1));
    case "appearance":   return runtime.cmdAppearance(rest[0]);
    case "privacy":      return runtime.cmdPrivacy(rest[0]);
    case "cal":          return runtime.cmdCal(rest[0], ...rest.slice(1));
    case "pause":        runtime.pause(); return "⏸ paused";
    case "resume":       runtime.resume(); return "▶ resumed";
    default:             return `unknown command: ${head}`;
  }
}

export function startWebServer(runtime: Runtime, cfg: ProfileConfig, port: number, token?: string): void {
  const clients = new Set<ServerResponse>();

  // Push events to all SSE clients
  runtime.on("event", (e: RuntimeEvent) => {
    if (!clients.size) return;
    const data = `data: ${JSON.stringify({ ...e, ts: Date.now() })}\n\n`;
    for (const client of clients) {
      try { client.write(data); } catch { clients.delete(client); }
    }
  });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const path = url.pathname;

    if (req.method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }
    if (!checkAuth(req, token)) { json(res, { error: "unauthorized" }, 401); return; }

    // ── Serve UI ─────────────────────────────────────────────────────────────
    if (path === "/" || path === "/index.html") {
      cors(res);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getUI(token));
      return;
    }

    // ── SSE stream ────────────────────────────────────────────────────────────
    if (path === "/events") {
      cors(res);
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      });
      res.write(": connected\n\n");
      res.write(`data: ${JSON.stringify({ type: "info", text: "connected", ts: Date.now() })}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    // ── REST API ──────────────────────────────────────────────────────────────
    if (path === "/api/profile") {
      json(res, {
        slug: cfg.slug, name: cfg.name, age: cfg.age, stage: cfg.stage,
        mode: cfg.mode, tz: cfg.tz, nationality: cfg.nationality,
        privacy: cfg.privacy ?? "open",
        hasTts: !!cfg.tts, hasImagegen: !!cfg.imagegen
      });
      return;
    }

    if (path === "/api/relationship") {
      const rel = await readRelationship(cfg.slug).catch(() => null);
      json(res, rel ?? {});
      return;
    }

    if (path === "/api/memory") {
      const files = ["persona.md", "speech.md", "communication.md", "long-term.md", "appearance.md"];
      const result: Record<string, string> = {};
      for (const f of files) {
        result[f] = await readMd(cfg.slug, f.includes("/") ? f : `memory/${f}`).catch(() => "");
        if (!result[f]) result[f] = await readMd(cfg.slug, f).catch(() => "");
      }
      json(res, result);
      return;
    }

    if (path.startsWith("/api/memory/")) {
      const file = decodeURIComponent(path.slice("/api/memory/".length));
      const content = await readMd(cfg.slug, file).catch(() => "");
      text(res, content);
      return;
    }

    if (path === "/api/logs") {
      const days = await listSessionDays(cfg.slug).catch(() => [] as string[]);
      json(res, days.slice().reverse().slice(0, 60));
      return;
    }

    if (path.startsWith("/api/log/")) {
      const day = decodeURIComponent(path.slice("/api/log/".length));
      const content = await readSessionLog(cfg.slug, day).catch(() => "");
      text(res, content);
      return;
    }

    if (path === "/api/calendar") {
      const events = await readCalendar(cfg.slug).catch(() => []);
      json(res, events);
      return;
    }

    if (path === "/api/today") {
      const day = sessionDate(cfg.tz);
      const content = await readSessionLog(cfg.slug, day).catch(() => "");
      json(res, { day, content });
      return;
    }

    // ── Command execution ─────────────────────────────────────────────────────
    if (path === "/api/command" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      req.on("end", async () => {
        try {
          const { command } = JSON.parse(body) as { command: string };
          if (typeof command !== "string" || !command.startsWith(":")) {
            json(res, { error: "command must start with :" }, 400);
            return;
          }
          const result = await executeCommand(runtime, command);
          json(res, { result });
        } catch (e) {
          json(res, { error: (e as Error).message }, 400);
        }
      });
      return;
    }

    res.writeHead(404); res.end("not found");
  });

  server.listen(port, () => {
    const hint = token ? `?token=${token}` : "";
    process.stdout.write(`[girl-agent] web: http://localhost:${port}/${hint}\n`);
  });
}
