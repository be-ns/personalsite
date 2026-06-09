'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ROOT } = require('./helpers');

const DATA = path.join(ROOT, 'assets', 'native-plants');

function readJson(...segments) {
  return JSON.parse(fs.readFileSync(path.join(DATA, ...segments), 'utf8'));
}

const meta = readJson('meta.json');
const { regions } = readJson('regions', 'regions.json');
const { plants } = readJson('plants', 'plants-core.json');
const nurseryData = readJson('nurseries', 'nurseries.json');

const regionKeys = new Set(Object.keys(regions));
const nurseryIds = new Set(Object.keys(nurseryData.nurseries));

test('every plant is internally consistent and uses known vocabulary', () => {
  const ids = new Set();
  for (const plant of plants) {
    assert.ok(plant.id && !ids.has(plant.id), `duplicate or missing id: ${plant.id}`);
    ids.add(plant.id);

    assert.ok(plant.commonName, `${plant.id} has a common name`);
    assert.ok(plant.scientificName, `${plant.id} has a scientific name`);
    assert.ok(meta.heightCategories.includes(plant.heightCategory),
      `${plant.id} height category "${plant.heightCategory}" is documented in meta.json`);
    assert.ok(meta.waterNeeds.includes(plant.waterNeeds),
      `${plant.id} water needs "${plant.waterNeeds}" is documented in meta.json`);
    assert.ok(plant.sunMin >= 1 && plant.sunMax <= 4 && plant.sunMin <= plant.sunMax,
      `${plant.id} sun range ${plant.sunMin}-${plant.sunMax} is valid`);

    for (const value of plant.ecologicalValue) {
      assert.ok(meta.ecologicalIcons.includes(value),
        `${plant.id} ecological value "${value}" is documented in meta.json`);
    }
    for (const key of plant.regionKeys) {
      assert.ok(regionKeys.has(key), `${plant.id} region "${key}" exists in regions.json`);
    }
  }
});

test('every region references only known nurseries', () => {
  for (const [key, region] of Object.entries(regions)) {
    for (const id of region.nurseryIds) {
      assert.ok(nurseryIds.has(id), `region ${key} nursery "${id}" exists in nurseries.json`);
    }
  }
});

test('every region has at least one plant', () => {
  for (const key of regionKeys) {
    assert.ok(plants.some((p) => p.regionKeys.includes(key)), `region ${key} has plants`);
  }
});

test('every nursery is reachable through a region or the defaults', () => {
  const reachable = new Set(nurseryData.defaultNurseryIds);
  for (const region of Object.values(regions)) {
    for (const id of region.nurseryIds) reachable.add(id);
  }
  for (const id of nurseryIds) {
    assert.ok(reachable.has(id), `nursery "${id}" is referenced somewhere`);
  }
});

for (const prefix of meta.zipPrefixes) {
  test(`ZIP prefix ${prefix} index is consistent`, () => {
    const index = readJson('zip-index', `ca-zip-prefix-${prefix}.json`);
    assert.equal(index.prefix, prefix);
    assert.ok(regionKeys.has(index.defaultRegionKey),
      `default region "${index.defaultRegionKey}" exists`);
    for (const [zip, entry] of Object.entries(index.zips)) {
      assert.ok(zip.startsWith(prefix), `${zip} matches its file's prefix`);
      assert.ok(regionKeys.has(entry.regionKey), `${zip} region "${entry.regionKey}" exists`);
    }
  });
}
