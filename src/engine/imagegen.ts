// Генерация selfie-фотографий персонажа через DALL-E 3 или Stability AI.
// Внешность хранится в memory/appearance.md (DALL-E prompt fragment на английском).
// Контекст берётся из daily-life — где она сейчас и чем занята.

import OpenAI from "openai";
import { readMd } from "../storage/md.js";
import type { ProfileConfig } from "../types.js";
import type { DailyLife } from "./daily-life.js";
import type { RelationshipScore } from "../types.js";

export type ImageGenProvider = "dalle3" | "stability";

export interface ImageGenConfig {
  provider: ImageGenProvider;
  apiKey: string;
  model?: string; // stability: "sd3.5-large" | "sd3.5-large-turbo"
}

// Строим DALL-E / SD промпт из внешности + контекста
function buildSelfiePrompt(appearance: string, context: string, mood: "happy" | "neutral" | "serious"): string {
  const moodHint =
    mood === "happy"   ? "smiling softly, relaxed expression" :
    mood === "serious" ? "neutral expression, looking away slightly" :
                         "calm natural expression";
  return [
    "realistic candid selfie photo of a young woman,",
    appearance.trim(),
    `— ${context},`,
    moodHint + ",",
    "shot on iPhone, natural lighting, no heavy filters, authentic everyday look, high quality"
  ].join(" ");
}

function moodFromScore(score?: Partial<RelationshipScore>): "happy" | "neutral" | "serious" {
  if (!score) return "neutral";
  if ((score.interest ?? 0) > 30 && (score.annoyance ?? 0) < 20) return "happy";
  if ((score.annoyance ?? 0) > 50) return "serious";
  return "neutral";
}

// Контекст из daily-life (где она сейчас)
function contextFromDailyLife(dl?: DailyLife, tz?: string): string {
  if (!dl || !tz) return "at home, cozy room in background";
  try {
    const { currentBlock } = require("./daily-life.js") as typeof import("./daily-life.js");
    const block = currentBlock(dl, tz);
    if (!block) return "at home, cozy room in background";
    const a = block.activity.toLowerCase();
    if (a.includes("улиц") || a.includes("прогул") || a.includes("парк")) return "outside, urban background, daylight";
    if (a.includes("кафе") || a.includes("кофе") || a.includes("рест")) return "in a cafe, warm interior, coffee cup visible";
    if (a.includes("учёб") || a.includes("пара") || a.includes("универ") || a.includes("школ")) return "at college campus or classroom hallway";
    if (a.includes("спорт") || a.includes("зал") || a.includes("тренир")) return "at the gym or sports area";
    if (a.includes("транспорт") || a.includes("дорог") || a.includes("метро")) return "in public transport, window in background";
    if (a.includes("магаз") || a.includes("шопинг")) return "in a shopping mall corridor";
  } catch { /* */ }
  return "at home, bedroom or living room in background, cozy";
}

// Скачиваем изображение по URL → Buffer
async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function generateSelfie(
  cfg: ProfileConfig,
  imageCfg: ImageGenConfig,
  dailyLife?: DailyLife,
  score?: Partial<RelationshipScore>
): Promise<Buffer> {
  const appearance = (await readMd(cfg.slug, "memory/appearance.md")).trim();
  if (!appearance) throw new Error("appearance.md пуст — сначала сгенерируй персону");

  const context = contextFromDailyLife(dailyLife, cfg.tz);
  const mood = moodFromScore(score);
  const prompt = buildSelfiePrompt(appearance, context, mood);

  if (imageCfg.provider === "dalle3") {
    const openai = new OpenAI({ apiKey: imageCfg.apiKey });
    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    });
    const url = res.data?.[0]?.url;
    if (!url) throw new Error("DALL-E вернул пустой URL");
    return downloadImage(url);
  }

  if (imageCfg.provider === "stability") {
    const model = imageCfg.model ?? "sd3.5-large-turbo";
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("aspect_ratio", "1:1");
    form.append("output_format", "jpeg");
    const res = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/sd3`, {
      method: "POST",
      headers: { Authorization: `Bearer ${imageCfg.apiKey}`, Accept: "image/*", model },
      body: form,
      signal: AbortSignal.timeout(60_000)
    });
    if (!res.ok) throw new Error(`Stability AI ${res.status}: ${await res.text().catch(() => "")}`);
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error(`Unknown imagegen provider: ${imageCfg.provider}`);
}
