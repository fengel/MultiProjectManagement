import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createDataStore } from './persistence.js';

test('createDataStore persists developers and projects in a filesystem JSON file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'resource-store-'));
  const filePath = path.join(dir, 'data.json');
  const store = createDataStore(filePath);

  const createdDeveloper = await store.saveDeveloper({
    name: 'Bob',
    role: 'Frontend Engineer',
    monthly_rate: 2000,
    target_fte: 1,
  });

  const createdProject = await store.saveProject({
    code: 'PRJ-02',
    name: 'Billing',
    status: 'Active',
  });

  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

  assert.equal(createdDeveloper.name, 'Bob');
  assert.equal(createdProject.code, 'PRJ-02');
  assert.ok(data.developers.some((item) => item.name === 'Bob'));
  assert.ok(data.projects.some((item) => item.code === 'PRJ-02'));
});

test('setActiveYear updates the active planning year in the file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'resource-store-'));
  const filePath = path.join(dir, 'data.json');
  const store = createDataStore(filePath);

  await store.createYear(2026);
  await store.createYear(2027);
  await store.setActiveYear((await store.getYears()).find((y) => y.year === 2027)?.id);

  const years = await store.getYears();
  assert.equal(years.find((year) => year.year === 2027)?.is_active, true);
  assert.equal(years.find((year) => year.year === 2026)?.is_active, false);
});
