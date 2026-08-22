'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT } = require('./helpers');

const html = fs.readFileSync(path.join(ROOT, 'fleet-service-requests.html'), 'utf8');
const match = html.match(/<script type="application\/json" id="seed-data">([\s\S]*?)<\/script>/);
assert.ok(match, 'the page carries an inline seed-data block');
const seed = JSON.parse(match[1])[0];

const systemCodes = new Set(Object.keys(seed.vmrs_systems));
const peopleIds = new Set(seed.people.map((p) => p.id));
const vehicleIds = new Set(seed.vehicles.map((v) => v.id));

const severityClass = (system) => {
  if (seed.safety_class_systems.includes(system)) return 'safety';
  if (seed.cosmetic_class_systems.includes(system)) return 'cosmetic';
  return 'other';
};

const reportSystem = (report, request) => {
  if (report.vmrs_assigned) return report.vmrs_assigned.system;
  if (report.vmrs_at_intake && report.vmrs_at_intake.system) return report.vmrs_at_intake.system;
  return request.vmrs.system;
};

test('every request uses a documented VMRS system code', () => {
  for (const req of seed.requests) {
    assert.ok(systemCodes.has(req.vmrs.system),
      `${req.id} system "${req.vmrs.system}" is in the VMRS table`);
  }
});

test('every transition history is legal under the state machine', () => {
  for (const req of seed.requests) {
    let current = 'reported';
    for (const t of req.transitions) {
      assert.ok(seed.allowed_transitions[current].includes(t.to),
        `${req.id}: ${current} -> ${t.to} is an allowed transition`);
      current = t.to;
    }
    assert.equal(current, req.state, `${req.id} state matches its transition history`);
  }
});

test('no merge crosses severity classes', () => {
  for (const req of seed.requests) {
    const reqClass = severityClass(req.vmrs.system);
    for (const rep of req.reports) {
      if (!rep.merge) continue;
      assert.equal(severityClass(reportSystem(rep, req)), reqClass,
        `${rep.id} merged into ${req.id} within one severity class`);
    }
  }
});

test('merge confidences respect the thresholds', () => {
  for (const req of seed.requests) {
    for (const rep of req.reports) {
      if (rep.merge && rep.merge.decision === 'auto_merged') {
        assert.ok(rep.merge.confidence >= 0.85,
          `${rep.id} auto-merged at ${rep.merge.confidence}, at or above 0.85`);
      }
    }
  }
  for (const item of seed.tray) {
    const o = item.outcome;
    if (o.decision === 'auto_merged') {
      assert.ok(o.confidence >= 0.85, `${item.report.id} auto-merge at ${o.confidence} is >= 0.85`);
    }
    if (o.decision === 'suggested') {
      assert.ok(o.confidence >= 0.55 && o.confidence <= 0.84,
        `${item.report.id} suggestion at ${o.confidence} sits in 0.55 to 0.84`);
    }
    if (o.decision === 'create_new') {
      assert.ok(o.confidence < 0.55, `${item.report.id} create-new at ${o.confidence} is below 0.55`);
    }
  }
});

test('every request answers both driver questions', () => {
  for (const req of seed.requests) {
    assert.ok(req.answers && req.answers.q1 && req.answers.q1.length > 0,
      `${req.id} answers "Can I keep driving?"`);
    const q2 = req.answers.q2;
    const answered = (typeof q2 === 'string' && q2.length > 0) ||
      (q2 && q2.not_yet_scheduled === true && Boolean(q2.notified_at));
    assert.ok(answered, `${req.id} answers "When will it be fixed?" or carries not_yet_scheduled`);
  }
});

test('every reporter and vehicle reference resolves', () => {
  for (const req of seed.requests) {
    assert.ok(vehicleIds.has(req.vehicle_id), `${req.id} vehicle "${req.vehicle_id}" exists`);
    for (const rep of req.reports) {
      assert.ok(peopleIds.has(rep.reporter), `${rep.id} reporter "${rep.reporter}" exists`);
    }
  }
  for (const item of seed.tray) {
    assert.ok(vehicleIds.has(item.vehicle_id), `tray ${item.report.id} vehicle exists`);
    assert.ok(peopleIds.has(item.report.reporter), `tray ${item.report.id} reporter exists`);
  }
});

test('the demo keeps its two load-bearing rows: a stale request and a reversible merge', () => {
  const now = Date.parse(seed.now);
  const stale = seed.requests.filter((r) => r.state === 'in_service' && r.shop_reported_ready_at);
  assert.ok(stale.length >= 1, 'at least one request is stale (shop reported ready, state not advanced)');

  const reversible = [];
  for (const req of seed.requests) {
    for (const rep of req.reports) {
      if (rep.merge && now - Date.parse(rep.merge.at) < 24 * 3600 * 1000) reversible.push(rep.id);
    }
  }
  assert.ok(reversible.length >= 1, 'at least one merge is inside its 24h reversal window');
});

test('report ids are unique across the whole dataset', () => {
  const seen = new Set();
  const all = seed.requests.flatMap((r) => r.reports.map((rep) => rep.id))
    .concat(seed.tray.map((t) => t.report.id));
  for (const id of all) {
    assert.ok(!seen.has(id), `report id ${id} appears once`);
    seen.add(id);
  }
});
