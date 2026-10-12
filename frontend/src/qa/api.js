// Client for the real QA pipeline routes (src/api/qa_routes.py), served by poc_api on :8000.
export const API_BASE = 'http://localhost:8000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return body;
}

export const qaApi = {
  status: () => request('/api/qa/status'),
  engine: () => request('/api/qa/engine'),
  scenarios: () => request('/api/qa/scenarios'),
  run: (scenarioId, headless = true) =>
    request('/api/qa/run', { method: 'POST', body: JSON.stringify({ scenario_id: scenarioId, headless }) }),
  evaluate: () => request('/api/qa/evaluate', { method: 'POST' }),
  latestEvaluation: () => request('/api/qa/evaluation/latest'),
};

export const pageUrl = (page) => `${API_BASE}/tests/dummy/${page}`;
