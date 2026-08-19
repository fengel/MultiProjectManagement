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

test('normalizes NFDI4ING projects into workpackages of an implicit parent project', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'resource-store-'));
  const filePath = path.join(dir, 'data.json');
  await fs.writeFile(filePath, JSON.stringify({
    projects: [
      { id: 'fis', code: '4ING-FIS', name: 'NFDI4ING-FIS', status: 'Active' },
      { id: 'sach', code: '4ING-Sach', name: 'NFDI4ING-Sach', status: 'Active' },
    ],
  }), 'utf8');

  const projects = await createDataStore(filePath).getProjects();
  const parent = projects.find((project) => project.code === 'NFDI4ING');

  assert.ok(parent);
  assert.deepEqual(
    projects.filter((project) => project.parent_project_id === parent.id).map((project) => project.code),
    ['4ING-FIS', '4ING-Sach'],
  );
});

test('persists a newly created workpackage with its parent project', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'resource-store-'));
  const filePath = path.join(dir, 'data.json');
  const store = createDataStore(filePath);

  const parent = (await store.getProjects()).find((project) => project.code === 'NFDI4ING');
  assert.ok(parent);

  const workpackage = await store.saveProject({
    code: '4ING-NEW',
    name: 'NFDI4ING-New Workpackage',
    status: 'Planning',
    parent_project_id: parent.id,
  });

  assert.equal(workpackage.parent_project_id, parent.id);
  assert.equal((await store.getProjects()).find((project) => project.id === workpackage.id)?.parent_project_id, parent.id);
});

test('keeps an existing SC4EU workpackage under its project', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'resource-store-'));
  const filePath = path.join(dir, 'data.json');
  await fs.writeFile(filePath, JSON.stringify({
    projects: [
      { id: 'sc4eu', code: '4EU', name: 'SC4EU', status: 'Active' },
      { id: 'wp1', code: 'WP1', name: '4EU', status: 'Active', parent_project_id: 'sc4eu' },
    ],
  }), 'utf8');

  const projects = await createDataStore(filePath).getProjects();
  assert.equal(projects.find((project) => project.code === 'WP1')?.parent_project_id, 'sc4eu');
});

test('infers the parent for a WP code when the create payload omits it', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'resource-store-'));
  const filePath = path.join(dir, 'data.json');
  const store = createDataStore(filePath);

  const parent = (await store.getProjects()).find((project) => project.code === 'NFDI4ING');
  assert.ok(parent);
  await store.saveProject({ code: 'WP1', name: 'Existing WP', parent_project_id: parent.id });

  const created = await store.saveProject({ code: 'WP2', name: 'New WP' });
  assert.equal(created.parent_project_id, parent.id);
});

test('repairs an existing unassigned WP when loading a single WP group', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'resource-store-'));
  const filePath = path.join(dir, 'data.json');
  await fs.writeFile(filePath, JSON.stringify({
    projects: [
      { id: 'sc4eu', code: '4EU', name: 'SC4EU', status: 'Active' },
      { id: 'wp1', code: 'WP1', name: 'WP1', status: 'Active', parent_project_id: 'sc4eu' },
      { id: 'wp3', code: 'WP3', name: 'WP3', status: 'Active' },
    ],
  }), 'utf8');

  const projects = await createDataStore(filePath).getProjects();
  assert.equal(projects.find((project) => project.code === 'WP3')?.parent_project_id, 'sc4eu');
});

test('saveWorkpackage always uses the explicit parent id', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'resource-store-'));
  const filePath = path.join(dir, 'data.json');
  const store = createDataStore(filePath);
  const parent = (await store.getProjects()).find((project) => project.code === 'NFDI4ING');
  assert.ok(parent);

  const created = await store.saveWorkpackage(parent.id, { code: 'WP99', name: 'Explicit WP' });
  assert.equal(created.parent_project_id, parent.id);
});
