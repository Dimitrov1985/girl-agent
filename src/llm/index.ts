import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ProfileConfig } from "../types.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: ChatContent;
}

export type ChatContent = string | ChatContentPart[];

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image"; mimeType: string; data: string };

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export interface LLMClient {
  chat(messages: ChatMessage[], opts?: LLMOptions): Promise<string>;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e: any) {
      lastErr = e;
      const status = e?.status ?? e?.response?.status;
      // Retry only on rate limit (429) or server errors (5xx)
      if (status === 429 || (status >= 500 && status < 600)) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

class OpenAILike implements LLMClient {
  private client: OpenAI;
  constructor(private cfg: ProfileConfig["llm"]) {
    this.client = new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL || undefined
    });
  }
  async chat(messages: ChatMessage[], opts: LLMOptions = {}): Promise<string> {
    const mapped = messages.map(m => ({
      role: m.role,
      content: typeof m.content === "string"
        ? m.content
        : m.content.map(p => p.type === "text"
          ? { type: "text" as const, text: p.text }
          : { type: "image_url" as const, image_url: { url: `data:${p.mimeType};base64,${p.data}` } })
    })) as any;

    const params = {
      model: this.cfg.model,
      messages: mapped,
      temperature: opts.temperature ?? 0.85,
      max_tokens: opts.maxTokens ?? 600,
    };

    return withRetry(async () => {
      try {
        const res = await this.client.chat.completions.create({
          ...params,
          response_format: opts.json ? { type: "json_object" as const } : undefined
        });
        return res.choices[0]?.message?.content?.trim() ?? "";
      } catch (e: any) {
        // Local/custom models (LMStudio, Ollama, etc.) may not support response_format.
        if (opts.json && (e?.status === 400 || e?.status === 422 || /response_format|json_object/i.test(e?.message ?? ""))) {
          const res = await this.client.chat.completions.create(params);
          return res.choices[0]?.message?.content?.trim() ?? "";
        }
        throw e;
      }
    });
  }
}

class AnthropicLike implements LLMClient {
  private client: Anthropic;
  constructor(private cfg: ProfileConfig["llm"]) {
    this.client = new Anthropic({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL || undefined
    });
  }
  async chat(messages: ChatMessage[], opts: LLMOptions = {}): Promise<string> {
    const system = messages.filter(m => m.role === "system").map(m => contentToText(m.content)).join("\n\n");
    const rest = messages
      .filter(m => m.role !== "system")
      .filter(m => contentToText(m.content).trim().length > 0)
      .map(m => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content
      }));

    // Anthropic требует чередование ролей и старт с user — мерджим подряд одинаковые
    const merged: { role: "user" | "assistant"; content: ChatContent }[] = [];
    for (const m of rest) {
      const last = merged[merged.length - 1];
      if (last && last.role === m.role) {
        last.content = mergeContent(last.content, m.content);
      } else {
        merged.push({ ...m });
      }
    }
    // Должно начинаться с user
    if (merged.length === 0 || merged[0]!.role !== "user") {
      merged.unshift({ role: "user", content: "(продолжай)" });
    }
    // Должно заканчиваться на user
    if (merged[merged.length - 1]!.role !== "user") {
      merged.push({ role: "user", content: "(продолжай)" });
    }

    return withRetry(async () => {
      const res = await this.client.messages.create({
        model: this.cfg.model,
        system: system || undefined,
        max_tokens: opts.maxTokens ?? 600,
        temperature: opts.temperature ?? 0.85,
        messages: merged.map(m => ({ role: m.role, content: anthropicContent(m.content) })) as any
      });
      const block = res.content.find(c => c.type === "text");
      return block && "text" in block ? block.text.trim() : "";
    });
  }
}

function contentToText(content: ChatContent): string {
  if (typeof content === "string") return content;
  return content.map(p => p.type === "text" ? p.text : `[image:${p.mimeType}]`).join("\n");
}

function mergeContent(a: ChatContent, b: ChatContent): ChatContent {
  if (typeof a === "string" && typeof b === "string") return a + "\n" + b;
  const aa: ChatContentPart[] = typeof a === "string" ? [{ type: "text", text: a }] : a;
  const bb: ChatContentPart[] = typeof b === "string" ? [{ type: "text", text: b }] : b;
  return [...aa, ...bb];
}

function anthropicContent(content: ChatContent): any {
  if (typeof content === "string") return content;
  return content.map(p => p.type === "text"
    ? { type: "text", text: p.text }
    : {
      type: "image",
      source: {
        type: "base64",
        media_type: p.mimeType,
        data: p.data
      }
    });
}

export function makeLLM(cfg: ProfileConfig["llm"]): LLMClient {
  return cfg.proto === "anthropic" ? new AnthropicLike(cfg) : new OpenAILike(cfg);
}
