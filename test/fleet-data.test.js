"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "fleet-service-requests.html"), "utf8");
const match = html.match(/<script type="application\/json" id="seed-data">([\s\S]*?)<\/script>/);
assert.ok(match, "seed-data block exists");
const seed = JSON.parse(match[1]);

const reqById = Object.fromEntries(seed.requests.map(r => [r.id, r]));
const vehIds = new Set(seed.vehicles.map(v => v.id));
const personIds = new Set(seed.people.map(p => p.id));
const safety = new Set(seed.safety_class_systems);

test("every request vmrs.system is a known system code", () => {
  for (const r of seed.requests) {
    assert.ok(seed.vmrs_systems[r.vmrs.system], `${r.id} system ${r.vmrs.system}`);
  }
});

test("every transition in every history is legal", () => {
  for (const r of seed.requests) {
    let prev = null;
    for (const h of r.history) {
      if (prev !== null) {
        assert.ok(
          seed.allowed_transitions[prev].includes(h.to),
          `${r.id}: ${prev} -> ${h.to} is illegal`
        );
      }
      prev = h.to;
    }
    assert.strictEqual(prev, r.state, `${r.id} history ends at current state`);
  }
});

test("no merge crosses severity class", () => {
  for (const rep of seed.reports) {
    if (!rep.merge) continue;
    const req = reqById[rep.request_id];
    const a = safety.has(rep.vmrs.system);
    const b = safety.has(req.vmrs.system);
    assert.strictEqual(a, b, `${rep.id} merged across severity class into ${req.id}`);
  }
});

test("auto merges are >= 0.85; scripted suggestions fall in 0.55-0.84", () => {
  for (const rep of seed.reports) {
    if (rep.merge && rep.merge.decision === "auto") {
      assert.ok(rep.merge.confidence >= 0.85, `${rep.id} auto at ${rep.merge.confidence}`);
    }
  }
  for (const s of seed.scripted_inbound) {
    if (!s.outcome) continue;
    if (s.outcome.decision === "auto_merged") assert.ok(s.outcome.confidence >= 0.85);
    if (s.outcome.decision === "suggested") {
      assert.ok(s.outcome.confidence >= 0.55 && s.outcome.confidence <= 0.84);
    }
    if (s.outcome.decision === "create_new") assert.ok(s.outcome.confidence < 0.55);
  }
});

test("every request answers both driver questions", () => {
  for (const r of seed.requests) {
    assert.ok(r.q1 && r.q1.length > 0, `${r.id} q1`);
    assert.ok(r.q2 && r.q2.length > 0, `${r.id} q2`);
  }
});

test("every reporter and vehicle reference resolves", () => {
  for (const rep of seed.reports) {
    assert.ok(personIds.has(rep.reporter), `${rep.id} reporter ${rep.reporter}`);
    assert.ok(reqById[rep.request_id], `${rep.id} request ${rep.request_id}`);
  }
  for (const r of seed.requests) {
    assert.ok(vehIds.has(r.vehicle_id), `${r.id} vehicle ${r.vehicle_id}`);
  }
});

test("the demo cannot silently lose its two most important rows", () => {
  const stale = seed.requests.some(r => r.shop_ready_at && r.state === "in_service");
  const reversible = seed.reports.some(r => r.merge && r.merge.reversible_until);
  assert.ok(stale, "at least one stale request exists");
  assert.ok(reversible, "at least one reversible merge exists");
});
