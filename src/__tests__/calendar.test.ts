import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { addCalendarEvent, readCalendar, removeCalendarEvent } from "../engine/calendar.js";

const TEST_SLUG = "__test-calendar__";

after(async () => {
  // Убираем тестовые данные
  await rm(`data/${TEST_SLUG}`, { recursive: true, force: true }).catch(() => {});
});

describe("calendar operations", () => {
  test("add and read calendar event", async () => {
    const ev = await addCalendarEvent(TEST_SLUG, "Doctor appointment", "2024-12-01", "10:00");
    assert.equal(ev.title, "Doctor appointment");
    assert.equal(ev.date, "2024-12-01");
    assert.equal(ev.time, "10:00");
    assert.ok(ev.id.length > 0);

    const events = await readCalendar(TEST_SLUG);
    assert.ok(events.some(e => e.title === "Doctor appointment"));
  });

  test("events are sorted by date", async () => {
    const slug = TEST_SLUG + "-sort";
    after(async () => { await rm(`data/${slug}`, { recursive: true, force: true }).catch(() => {}); });
    await addCalendarEvent(slug, "Later event",   "2024-12-10");
    await addCalendarEvent(slug, "Earlier event", "2024-12-01");
    await addCalendarEvent(slug, "Middle event",  "2024-12-05");

    const events = await readCalendar(slug);
    assert.equal(events[0]!.date, "2024-12-01");
    assert.equal(events[1]!.date, "2024-12-05");
    assert.equal(events[2]!.date, "2024-12-10");
  });

  test("remove calendar event", async () => {
    const slug = TEST_SLUG + "-rm";
    after(async () => { await rm(`data/${slug}`, { recursive: true, force: true }).catch(() => {}); });
    const ev = await addCalendarEvent(slug, "Remove me", "2024-12-01");
    const ok = await removeCalendarEvent(slug, ev.id);
    assert.equal(ok, true);
    const events = await readCalendar(slug);
    assert.equal(events.length, 0);
  });

  test("remove non-existent event returns false", async () => {
    const ok = await removeCalendarEvent(TEST_SLUG + "-noexist", "fake-id-123");
    assert.equal(ok, false);
  });

  test("readCalendar returns empty array when file doesn't exist", async () => {
    const events = await readCalendar("__no-such-profile__");
    assert.deepEqual(events, []);
  });
});
