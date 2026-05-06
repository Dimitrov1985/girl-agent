import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computePresenceProfile } from "../engine/presence.js";
import type { ProfileConfig } from "../types.js";

function makeCfg(overrides: Partial<ProfileConfig> = {}): ProfileConfig {
  return {
    slug: "test", name: "Anna", age: 20, nationality: "RU",
    tz: "Europe/Moscow", mode: "bot", stage: "tg-given-cold",
    llm: { presetId: "openai", proto: "openai", apiKey: "x", model: "gpt-4.1" },
    telegram: { botToken: "x" },
    mcp: [], createdAt: new Date().toISOString(),
    sleepFrom: 23, sleepTo: 8, nightWakeChance: 0.05,
    ...overrides
  };
}

describe("computePresenceProfile", () => {
  test("returns a valid presence pattern", () => {
    const validPatterns = ["phone-attached", "burst-checker", "rare-checker", "evening-only", "phone-attached-night"];
    const profile = computePresenceProfile(makeCfg());
    assert.ok(validPatterns.includes(profile.pattern));
  });

  test("is deterministic — same config gives same result", () => {
    const cfg = makeCfg({ name: "Masha", age: 22 });
    const a = computePresenceProfile(cfg);
    const b = computePresenceProfile(cfg);
    assert.equal(a.pattern, b.pattern);
    assert.equal(a.checkEveryMin, b.checkEveryMin);
    assert.equal(a.onlineWindowMin, b.onlineWindowMin);
  });

  test("different names give different patterns (seed variation)", () => {
    const profiles = ["Anna", "Kate", "Sophie", "Emma", "Lisa"].map(name =>
      computePresenceProfile(makeCfg({ name }))
    );
    const patterns = new Set(profiles.map(p => p.pattern));
    // With 5 different names we should see at least 2 different patterns
    assert.ok(patterns.size >= 2);
  });

  test("priority notifications increases offlineReplyChance", () => {
    const normal = computePresenceProfile(makeCfg({ communication: { notifications: "normal", messageStyle: "balanced", initiative: "medium", lifeSharing: "medium" } }));
    const priority = computePresenceProfile(makeCfg({ communication: { notifications: "priority", messageStyle: "balanced", initiative: "medium", lifeSharing: "medium" } }));
    assert.ok(priority.offlineReplyChance >= normal.offlineReplyChance);
  });

  test("muted notifications decreases nightWakeChance", () => {
    const normal = computePresenceProfile(makeCfg({ nightWakeChance: 0.1, communication: { notifications: "normal", messageStyle: "balanced", initiative: "medium", lifeSharing: "medium" } }));
    const muted = computePresenceProfile(makeCfg({ nightWakeChance: 0.1, communication: { notifications: "muted", messageStyle: "balanced", initiative: "medium", lifeSharing: "medium" } }));
    assert.ok(muted.nightWakeChance <= normal.nightWakeChance);
  });

  test("sleepFrom and sleepTo match config", () => {
    const cfg = makeCfg({ sleepFrom: 1, sleepTo: 10 });
    const profile = computePresenceProfile(cfg);
    assert.equal(profile.sleepFrom, 1);
    assert.equal(profile.sleepTo, 10);
  });

  test("checkEveryMin is positive", () => {
    const profile = computePresenceProfile(makeCfg());
    assert.ok(profile.checkEveryMin > 0);
  });

  test("offlineReplyChance is between 0 and 1", () => {
    const profile = computePresenceProfile(makeCfg());
    assert.ok(profile.offlineReplyChance >= 0 && profile.offlineReplyChance <= 1);
  });
});
