import http from 'node:http';
import { createDataStore } from './persistence.js';
import { getDataFile } from './db.js';

const store = createDataStore(getDataFile());
const PORT = process.env.PORT || 3001;

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    if (path === '/api/data' && req.method === 'GET') {
      const years = await store.getYears();
      const developers = await store.getDevelopers();
      const projects = await store.getProjects();
      const allocations = await store.getAllocations();
      const salary_entries = await store.getSalaryEntries();
      const extra_payments = await store.getExtraPayments();
      sendJson(res, 200, { years, developers, projects, allocations, salary_entries, extra_payments });
      return;
    }

    if (path === '/api/developers' && req.method === 'POST') {
      const body = await readBody(req);
      const developer = await store.saveDeveloper(body);
      sendJson(res, 200, developer);
      return;
    }

    if (path.startsWith('/api/developers/') && req.method === 'DELETE') {
      const id = path.split('/').pop();
      await store.deleteDeveloper(id);
      sendJson(res, 200, { ok: true });
      return;
    }

    const workpackageMatch = path.match(/^\/api\/projects\/([^/]+)\/workpackages$/);
    if (workpackageMatch && req.method === 'POST') {
      const body = await readBody(req);
      const workpackage = await store.saveWorkpackage(workpackageMatch[1], body);
      sendJson(res, 200, workpackage);
      return;
    }

    if (path === '/api/projects' && req.method === 'POST') {
      const body = await readBody(req);
      const project = await store.saveProject(body);
      sendJson(res, 200, project);
      return;
    }

    if (path.startsWith('/api/projects/') && req.method === 'DELETE') {
      const id = path.split('/').pop();
      await store.deleteProject(id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (path === '/api/years' && req.method === 'POST') {
      const body = await readBody(req);
      const year = await store.createYear(body.year, body.workingDaysPerMonth ?? 20);
      sendJson(res, 200, year);
      return;
    }

    if (path === '/api/years/active' && req.method === 'POST') {
      const body = await readBody(req);
      await store.setActiveYear(body.yearId);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (path === '/api/years/working-days' && req.method === 'POST') {
      const body = await readBody(req);
      const year = await store.saveWorkingDays(body.yearId, body.workingDaysPerMonth);
      sendJson(res, 200, year ?? { ok: false });
      return;
    }

    if (path === '/api/allocations' && req.method === 'POST') {
      const body = await readBody(req);
      const allocation = await store.upsertAllocation(body);
      sendJson(res, 200, allocation);
      return;
    }

    if (path.startsWith('/api/allocations/') && req.method === 'DELETE') {
      const id = path.split('/').pop();
      await store.deleteAllocation(id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (path === '/api/salary-entries' && req.method === 'POST') {
      const body = await readBody(req);
      const entry = await store.saveSalaryEntry(body);
      sendJson(res, 200, entry);
      return;
    }

    if (path.startsWith('/api/salary-entries/') && req.method === 'DELETE') {
      const id = path.split('/').pop();
      await store.deleteSalaryEntry(id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (path === '/api/extra-payments' && req.method === 'POST') {
      const body = await readBody(req);
      const payment = await store.saveExtraPayment(body);
      sendJson(res, 200, payment);
      return;
    }

    if (path.startsWith('/api/extra-payments/') && req.method === 'DELETE') {
      const id = path.split('/').pop();
      await store.deleteExtraPayment(id);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Server error' });
  }
});

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  if (!body) return {};
  return JSON.parse(body);
}

server.listen(PORT, () => {
  console.log(`Local API listening on http://localhost:${PORT}`);
});
