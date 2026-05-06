import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { activeConflict, escalateFromMood, softenFromMood } from "../engine/conflict.js";
import type { ConflictState } from "../engine/conflict.js";

const empty: ConflictState = { level: 0, history: [] };
const zeroScore = { interest: 0, trust: 0, attraction: 0, annoyance: 0, cringe: 0 };

describe("activeConflict", () => {
  test("no conflict when level=0", () => {
    const { active, coldActive } = activeConflict(empty);
    assert.equal(active, false);
    assert.equal(coldActive, false);
  });

  test("active when level>0", () => {
    const { active } = activeConflict({ ...empty, level: 2 });
    assert.equal(active, true);
  });

  test("coldActive when coldUntil is in the future", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const { coldActive } = activeConflict({ ...empty, level: 1, coldUntil: future });
    assert.equal(coldActive, true);
  });

  test("coldActive=false when coldUntil is in the past", () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    const { coldActive } = activeConflict({ ...empty, level: 1, coldUntil: past });
    assert.equal(coldActive, false);
  });
});

describe("escalateFromMood", () => {
  test("no change when delta is neutral", () => {
    const result = escalateFromMood(empty, {}, zeroScore, "hello");
    assert.equal(result, empty);
  });

  test("reaches level 1 on mild annoyance delta", () => {
    const result = escalateFromMood(empty, { annoyance: 10 }, zeroScore, "ugh");
    assert.equal(result.level, 1);
    assert.ok(result.coldUntil, "should set coldUntil");
  });

  test("reaches level 2 on moderate annoyance delta", () => {
    const result = escalateFromMood(empty, { annoyance: 18 }, zeroScore, "stop");
    assert.equal(result.level, 2);
  });

  test("reaches level 3 on heavy annoyance delta", () => {
    const result = escalateFromMood(empty, { annoyance: 30 }, zeroScore, "wtf");
    assert.equal(result.level, 3);
  });

  test("level never decreases via escalate", () => {
    const existing: ConflictState = { ...empty, level: 3, coldUntil: new Date(Date.now() + 86400_000).toISOString() };
    const result = escalateFromMood(existing, { annoyance: 5 }, zeroScore, "ok");
    assert.ok(result.level >= 3);
  });

  test("adds entry to history", () => {
    const result = escalateFromMood(empty, { annoyance: 15 }, zeroScore, "bad message");
    assert.ok(result.history.length > 0);
  });

  test("triggers level 4 when score is near breaking point", () => {
    const badScore = { interest: -40, trust: 0, attraction: 0, annoyance: 90, cringe: 75 };
    const result = escalateFromMood(empty, { annoyance: 5 }, badScore, "last straw");
    assert.equal(result.level, 4);
  });
});

describe("softenFromMood", () => {
  test("no change when level=0", () => {
    const result = softenFromMood(empty, { attraction: 20, trust: 10 });
    assert.equal(result, empty);
  });

  test("no change when positive delta is too small", () => {
    const conflict: ConflictState = { ...empty, level: 2 };
    const result = softenFromMood(conflict, { attraction: 5 });
    assert.equal(result.level, 2);
  });

  test("reduces level by 1 on strong positive delta", () => {
    const conflict: ConflictState = { ...empty, level: 2 };
    const result = softenFromMood(conflict, { attraction: 10, trust: 5 });
    assert.equal(result.level, 1);
  });

  test("clears cold and metadata when reaching level 0", () => {
    const conflict: ConflictState = {
      ...empty, level: 1,
      coldUntil: new Date(Date.now() + 3600_000).toISOString(),
      reason: "was rude", since: new Date().toISOString()
    };
    const result = softenFromMood(conflict, { attraction: 8, trust: 5 });
    assert.equal(result.level, 0);
    assert.equal(result.coldUntil, undefined);
    assert.equal(result.reason, undefined);
  });

  test("halves remaining cold time on partial softening", () => {
    const future = new Date(Date.now() + 4 * 3600_000).toISOString();
    const conflict: ConflictState = { ...empty, level: 3, coldUntil: future };
    const result = softenFromMood(conflict, { attraction: 8, trust: 5 });
    if (result.coldUntil) {
      const remaining = new Date(result.coldUntil).getTime() - Date.now();
      assert.ok(remaining < 2.5 * 3600_000, "cold should be roughly halved");
    }
  });
});
