const API_BASE = 'http://localhost:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`);
  return body;
}

export const ciApi = {
  cases: () => request('/api/ci/cases'),
  run: (caseId) => request('/api/ci/run', {
    method: 'POST',
    body: JSON.stringify({ case_id: caseId }),
  }),
};
