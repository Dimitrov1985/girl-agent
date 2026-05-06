import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { applyMoodDelta } from "../engine/reflect.js";

const base = { interest: 0, trust: 0, attraction: 0, annoyance: 0, cringe: 0 };

describe("applyMoodDelta", () => {
  test("applies positive delta correctly", () => {
    const result = applyMoodDelta(base, { interest: 10, trust: 5 });
    assert.equal(result.interest, 10);
    assert.equal(result.trust, 5);
    assert.equal(result.attraction, 0);
  });

  test("applies negative delta correctly", () => {
    const result = applyMoodDelta({ ...base, interest: 20 }, { interest: -15 });
    assert.equal(result.interest, 5);
  });

  test("clamps at upper bound of 100", () => {
    const result = applyMoodDelta({ ...base, interest: 95 }, { interest: 20 });
    assert.equal(result.interest, 100);
  });

  test("clamps at lower bound of -100", () => {
    const result = applyMoodDelta({ ...base, interest: -95 }, { interest: -20 });
    assert.equal(result.interest, -100);
  });

  test("rounds fractional values", () => {
    const result = applyMoodDelta(base, { interest: 3.7 });
    assert.equal(result.interest, 4);
  });

  test("empty delta preserves all values", () => {
    const score = { interest: 30, trust: 20, attraction: 10, annoyance: 5, cringe: 2 };
    const result = applyMoodDelta(score, {});
    assert.deepEqual(result, score);
  });

  test("can update multiple fields at once", () => {
    const result = applyMoodDelta(base, {
      interest: 15, trust: 10, attraction: 5, annoyance: -3, cringe: -1
    });
    assert.equal(result.interest, 15);
    assert.equal(result.trust, 10);
    assert.equal(result.attraction, 5);
    assert.equal(result.annoyance, -3);
    assert.equal(result.cringe, -1);
  });

  test("does not mutate the original score", () => {
    const original = { ...base, interest: 50 };
    applyMoodDelta(original, { interest: 10 });
    assert.equal(original.interest, 50);
  });
});
