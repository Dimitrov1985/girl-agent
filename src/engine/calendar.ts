// Локальный файловый календарь событий.
// Хранится в data/<slug>/calendar.json
// Инжектируется в системный промпт как контекст расписания.

import { promises as fs } from "node:fs";
import path from "node:path";
import { profileDir, sessionDate } from "../storage/md.js";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;   // YYYY-MM-DD
  time?: string;  // HH:MM (опционально)
  notes?: string;
}

function calendarPath(slug: string): string {
  return path.join(profileDir(slug), "calendar.json");
}

export async function readCalendar(slug: string): Promise<CalendarEvent[]> {
  try {
    const raw = await fs.readFile(calendarPath(slug), "utf8");
    return JSON.parse(raw) as CalendarEvent[];
  } catch {
    return [];
  }
}

export async function writeCalendar(slug: string, events: CalendarEvent[]): Promise<void> {
  const p = calendarPath(slug);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(events, null, 2), "utf8");
}

export async function addCalendarEvent(slug: string, title: string, date: string, time?: string, notes?: string): Promise<CalendarEvent> {
  const events = await readCalendar(slug);
  const ev: CalendarEvent = {
    id: Date.now().toString(36),
    title: title.trim(),
    date,
    time,
    notes: notes?.trim() || undefined
  };
  events.push(ev);
  // Сортируем по дате
  events.sort((a, b) => (a.date + (a.time ?? "")) < (b.date + (b.time ?? "")) ? -1 : 1);
  await writeCalendar(slug, events);
  return ev;
}

export async function removeCalendarEvent(slug: string, id: string): Promise<boolean> {
  const events = await readCalendar(slug);
  const filtered = events.filter(e => e.id !== id);
  if (filtered.length === events.length) return false;
  await writeCalendar(slug, filtered);
  return true;
}

/** Возвращает строку для системного промпта с ближайшими событиями (следующие 7 дней) */
export async function getCalendarContext(slug: string, tz: string): Promise<string> {
  const events = await readCalendar(slug);
  if (!events.length) return "";

  const today = sessionDate(tz);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const upcoming = events.filter(e => e.date >= today && e.date <= cutoffStr);
  if (!upcoming.length) return "";

  const lines = upcoming.map(e => {
    const when = e.time ? `${e.date} в ${e.time}` : e.date;
    return `- ${when}: ${e.title}${e.notes ? ` (${e.notes})` : ""}`;
  });

  return `# Ближайшие события (следующие 7 дней)\n${lines.join("\n")}\nУчитывай их в daily-life: занятость, настроение, могут влиять на доступность.`;
}
