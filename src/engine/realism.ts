import type { LLMClient } from "../llm/index.js";
import type { ProfileConfig } from "../types.js";
import { readMd, writeMd, appendMd, sessionDate } from "../storage/md.js";

export interface RealismContext {
  facts: string;
  episodes: string;
  relationshipTimeline: string;
  attachment: string;
  time: string;
  weeklyLife: string;
  socialGraph: string;
  habits: string;
  openLoops: string;
}

const DEFAULT_FACTS = `# facts
- имя основного собеседника неизвестно
- важные факты о нём записывать только если он сам сказал явно
- спорные факты держать как uncertain, не утверждать уверенно`;

const DEFAULT_ATTACHMENT = `# attachment
attachment: anxious-avoidant
jealousy: 0.58
needForAttention: 0.66
trustRecoverySpeed: 0.34
conflictStyle: withdraws_then_snaps
flirtStyle: teasing_then_soft
apologyStyle: awkward_short`;

const DEFAULT_WEEKLY = `# week-plan
будни: учёба/работа, дорога, вечером телефон/сериал/подруга/дом
выходные: поздно просыпается, бытовые дела, иногда встречается с подругой
не каждый день доступна; иногда занята, устала или просто не хочет отвечать`;

const DEFAULT_SOCIAL = `# contacts
- мама: бытовые конфликты, контроль, иногда забота
- лера: подруга, язвит, зовёт гулять
- настя: подруга поспокойнее, может слушать голосовые
- одногруппники/коллеги: фон, не романтика`;

const DEFAULT_HABITS = `# habits
- утром отвечает суше
- вечером теплее, если день не выбесил
- когда устала, читает и откладывает ответ
- редко объясняет почему пропала
- может вспомнить мелкую деталь через день, если она эмоционально зацепила`;

function today(tz: string): string {
  return sessionDate(tz);
}

async function ensureDefaults(cfg: ProfileConfig): Promise<void> {
  const defaults: [string, string][] = [
    ["memory/facts.md", DEFAULT_FACTS],
    ["relationship/timeline.md", `# relationship timeline\n- ${new Date().toISOString()}: профиль создан, стадия ${cfg.stage}`],
    ["life/week-plan.md", DEFAULT_WEEKLY],
    ["life/contacts.md", DEFAULT_SOCIAL],
    ["life/habits.md", DEFAULT_HABITS],
    ["personality/attachment.md", DEFAULT_ATTACHMENT],
    ["time/open-loops.md", "# open loops\n"],
    ["time/promises.md", "# promises\n"],
    ["memory/uncertain.md", "# uncertain\n"]
  ];
  await Promise.all(defaults.map(async ([path, content]) => {
    const current = await readMd(cfg.slug, path);
    if (!current.trim()) await writeMd(cfg.slug, path, content + "\n");
  }));
}

export async function loadRealismContext(cfg: ProfileConfig, incoming?: string): Promise<RealismContext> {
  await ensureDefaults(cfg);
  const [facts, episodesRaw, timeline, attachment, openLoops, promises, weeklyLife, socialGraph, habits] = await Promise.all([
    readMd(cfg.slug, "memory/facts.md"),
    readMd(cfg.slug, `memory/episodes/${today(cfg.tz)}.md`),
    readMd(cfg.slug, "relationship/timeline.md"),
    readMd(cfg.slug, "personality/attachment.md"),
    readMd(cfg.slug, "time/open-loops.md"),
    readMd(cfg.slug, "time/promises.md"),
    readMd(cfg.slug, "life/week-plan.md"),
    readMd(cfg.slug, "life/contacts.md"),
    readMd(cfg.slug, "life/habits.md")
  ]);
  const query = incoming?.toLowerCase() ?? "";
  const factLines = facts.split("\n").filter(l => l.trim());
  const relevantFacts = query.length > 3
    ? factLines.filter(l => query.split(/\s+/).some(t => t.length > 3 && l.toLowerCase().includes(t))).slice(-12).join("\n") || facts.slice(-1600)
    : facts.slice(-1600);
  return {
    facts: relevantFacts,
    episodes: episodesRaw.slice(-1800),
    relationshipTimeline: timeline.slice(-2000),
    attachment: attachment.slice(-1200),
    time: [openLoops.slice(-1200), promises.slice(-1200)].filter(Boolean).join("\n\n"),
    weeklyLife: weeklyLife.slice(-1200),
    socialGraph: socialGraph.slice(-1200),
    habits: habits.slice(-1200),
    openLoops: openLoops.slice(-1200)
  };
}

export function realismPromptFragment(ctx: RealismContext): string {
  const s = (str: string, max: number) => str.slice(0, max);
  return [
    "# Реалистичная непрерывность",
    "Используй как фон. Не упоминай что у тебя есть файлы/память. Если факта нет — не выдумывай.",
    ctx.facts ? `## Факты о нём\n${s(ctx.facts, 600)}` : "",
    ctx.episodes ? `## Эпизоды дня\n${s(ctx.episodes, 400)}` : "",
    ctx.relationshipTimeline ? `## История\n${s(ctx.relationshipTimeline, 400)}` : "",
    ctx.time ? `## Обещания/петли\n${s(ctx.time, 300)}` : "",
    ctx.habits ? `## Привычки\n${s(ctx.habits, 300)}` : "",
  ].filter(Boolean).join("\n\n");
}

export async function recordInteractionMemory(llm: LLMClient, cfg: ProfileConfig, incoming: string, reply?: string): Promise<void> {
  if (!incoming.trim()) return;
  const raw = await llm.chat([
    { role: "system", content: "Ты извлекаешь только устойчивые факты, эпизоды, обещания и эмоциональные следы из переписки. Верни строгий JSON. Не выдумывай." },
    { role: "user", content: `Профиль: ${cfg.name}, стадия ${cfg.stage}.\nОн написал: ${incoming}\nОна ответила: ${reply ?? ""}\n\nJSON:\n{\n  "facts": ["короткие факты о нём или о ней, если явно сказано"],\n  "episode": "одно предложение, если был эмоциональный/важный момент, иначе пусто",\n  "promise": "обещание/план на будущее, иначе пусто",\n  "openLoop": "незакрытая тема, иначе пусто",\n  "timeline": "milestone отношений, если был, иначе пусто",\n  "uncertain": ["сомнительные факты"]\n}` }
  ], { temperature: 0.2, maxTokens: 3500, json: true });
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return; }
  const stamp = new Date().toISOString();
  const facts = Array.isArray(parsed.facts) ? parsed.facts.filter((x: unknown) => typeof x === "string" && x.trim()).slice(0, 8) : [];
  if (facts.length) await appendMd(cfg.slug, "memory/facts.md", facts.map((f: string) => `- ${stamp}: ${f}`).join("\n") + "\n");
  if (typeof parsed.episode === "string" && parsed.episode.trim()) await appendMd(cfg.slug, `memory/episodes/${today(cfg.tz)}.md`, `- ${stamp}: ${parsed.episode.trim()}\n`);
  if (typeof parsed.promise === "string" && parsed.promise.trim()) await appendMd(cfg.slug, "time/promises.md", `- ${stamp}: ${parsed.promise.trim()}\n`);
  if (typeof parsed.openLoop === "string" && parsed.openLoop.trim()) await appendMd(cfg.slug, "time/open-loops.md", `- ${stamp}: ${parsed.openLoop.trim()}\n`);
  if (typeof parsed.timeline === "string" && parsed.timeline.trim()) await appendMd(cfg.slug, "relationship/timeline.md", `- ${stamp}: ${parsed.timeline.trim()}\n`);
  const uncertain = Array.isArray(parsed.uncertain) ? parsed.uncertain.filter((x: unknown) => typeof x === "string" && x.trim()).slice(0, 6) : [];
  if (uncertain.length) await appendMd(cfg.slug, "memory/uncertain.md", uncertain.map((f: string) => `- ${stamp}: ${f}`).join("\n") + "\n");
}

export async function maybeAdvanceRelationshipTimeline(cfg: ProfileConfig, previousStage: string, nextStage: string): Promise<void> {
  if (previousStage === nextStage) return;
  await ensureDefaults(cfg);
  await appendMd(cfg.slug, "relationship/timeline.md", `- ${new Date().toISOString()}: стадия изменилась ${previousStage} → ${nextStage}\n`);
}
