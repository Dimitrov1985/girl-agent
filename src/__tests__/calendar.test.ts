import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Патчим DATA_ROOT через переменную окружения до импорта
let tmpDir: string;

describe("calendar operations", async () => {
  before(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "girl-agent-test-"));
    process.env.GIRL_AGENT_DATA_ROOT = tmpDir;
  });

  after(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    delete process.env.GIRL_AGENT_DATA_ROOT;
  });

  // Динамический импорт после установки env
  test("add and read calendar event", async () => {
    const { addCalendarEvent, readCalendar } = await import("../engine/calendar.js");
    const slug = "cal-test";
    const ev = await addCalendarEvent(slug, "Doctor appointment", "2024-12-01", "10:00");
    assert.equal(ev.title, "Doctor appointment");
    assert.equal(ev.date, "2024-12-01");
    assert.equal(ev.time, "10:00");
    assert.ok(ev.id.length > 0);

    const events = await readCalendar(slug);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.title, "Doctor appointment");
  });

  test("events are sorted by date", async () => {
    const { addCalendarEvent, readCalendar } = await import("../engine/calendar.js");
    const slug = "cal-sort";
    await addCalendarEvent(slug, "Later event", "2024-12-10");
    await addCalendarEvent(slug, "Earlier event", "2024-12-01");
    await addCalendarEvent(slug, "Middle event", "2024-12-05");

    const events = await readCalendar(slug);
    assert.equal(events[0]!.date, "2024-12-01");
    assert.equal(events[1]!.date, "2024-12-05");
    assert.equal(events[2]!.date, "2024-12-10");
  });

  test("remove calendar event", async () => {
    const { addCalendarEvent, removeCalendarEvent, readCalendar } = await import("../engine/calendar.js");
    const slug = "cal-remove";
    const ev = await addCalendarEvent(slug, "Remove me", "2024-12-01");
    const ok = await removeCalendarEvent(slug, ev.id);
    assert.equal(ok, true);
    const events = await readCalendar(slug);
    assert.equal(events.length, 0);
  });

  test("remove non-existent event returns false", async () => {
    const { removeCalendarEvent } = await import("../engine/calendar.js");
    const ok = await removeCalendarEvent("cal-noexist", "fake-id-123");
    assert.equal(ok, false);
  });

  test("readCalendar returns empty array when file doesn't exist", async () => {
    const { readCalendar } = await import("../engine/calendar.js");
    const events = await readCalendar("no-such-profile");
    assert.deepEqual(events, []);
  });
});
