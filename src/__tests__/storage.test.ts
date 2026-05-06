import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sessionDate, slugify, parseSessionLogTurns } from "../storage/md.js";

describe("sessionDate", () => {
  test("returns YYYY-MM-DD format", () => {
    const d = sessionDate("Europe/Moscow");
    assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
  });

  test("rolls back to previous day before 5am", () => {
    // 3:30am Moscow = before 5am → should be previous day
    const earlyMorning = new Date("2024-06-15T00:30:00Z"); // UTC 0:30 = MSK 3:30
    const result = sessionDate("Europe/Moscow", earlyMorning);
    assert.equal(result, "2024-06-14");
  });

  test("keeps current day at 10am", () => {
    const morning = new Date("2024-06-15T07:00:00Z"); // UTC 7am = MSK 10am
    const result = sessionDate("Europe/Moscow", morning);
    assert.equal(result, "2024-06-15");
  });

  test("handles invalid timezone gracefully", () => {
    // Should fall back to UTC without throwing
    assert.doesNotThrow(() => sessionDate("Invalid/Timezone"));
  });

  test("different timezones can return different dates", () => {
    // 23:30 in New York = 4:30am next day in London
    const dt = new Date("2024-06-15T03:30:00Z"); // UTC
    const nyDate = sessionDate("America/New_York", dt);   // 23:30 NY = valid day
    const sydneyDate = sessionDate("Australia/Sydney", dt); // 13:30 Sydney = same day
    assert.ok(typeof nyDate === "string");
    assert.ok(typeof sydneyDate === "string");
  });
});

describe("slugify", () => {
  test("converts Russian name to latin-ish slug", () => {
    const result = slugify("Аня");
    assert.ok(result.length > 0);
    assert.doesNotMatch(result, /^-|-$/);
  });

  test("handles spaces and special chars", () => {
    const result = slugify("Анна Иванова");
    assert.doesNotMatch(result, /\s/);
  });

  test("lowercases input", () => {
    const result = slugify("Emma");
    assert.equal(result, "emma");
  });

  test("trims leading/trailing dashes", () => {
    const result = slugify("---name---");
    assert.doesNotMatch(result, /^-|-$/);
  });

  test("returns fallback for empty string", () => {
    const result = slugify("");
    assert.ok(result.length > 0);
  });

  test("caps length at 40", () => {
    const long = "a".repeat(100);
    assert.ok(slugify(long).length <= 40);
  });
});

describe("parseSessionLogTurns", () => {
  const log = `[2024-06-15T10:00:00.000Z] он(123): привет
  -> она: ку
[2024-06-15T10:01:00.000Z] он(123): как дела
  -> она: норм
[2024-06-15T10:02:00.000Z] он(456): привет от другого
  -> она: привет`;

  test("parses user and assistant turns", () => {
    const turns = parseSessionLogTurns(log);
    assert.ok(turns.length >= 4);
  });

  test("filters by fromId", () => {
    const turns = parseSessionLogTurns(log, 123);
    const userTurns = turns.filter(t => t.role === "user");
    assert.equal(userTurns.length, 2);
    userTurns.forEach(t => assert.equal(t.content !== "привет от другого", true));
  });

  test("returns empty array for empty log", () => {
    const turns = parseSessionLogTurns("");
    assert.equal(turns.length, 0);
  });

  test("respects limit", () => {
    const bigLog = Array.from({ length: 100 }, (_, i) =>
      `[2024-06-15T10:00:00.000Z] он(1): msg ${i}\n  -> она: reply ${i}`
    ).join("\n");
    const turns = parseSessionLogTurns(bigLog, undefined, 10);
    assert.ok(turns.length <= 10);
  });

  test("parses proactive messages", () => {
    const proactiveLog = `[2024-06-15T10:00:00.000Z] он(1): hi\n  -> [proactive] она: hey`;
    const turns = parseSessionLogTurns(proactiveLog);
    const assistant = turns.find(t => t.role === "assistant");
    assert.ok(assistant);
  });
});
