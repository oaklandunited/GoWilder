import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { DEFAULT_SCENARIO } from '../shared/presets.js';

describe('GoWild Compass Express API', () => {
  const app = createApp();

  it('GET /healthz returns 200 OK', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('gowild-compass');
  });

  it('GET /api/presets returns corridor presets and hubs', async () => {
    const res = await request(app).get('/api/presets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.presets)).toBe(true);
    expect(res.body.presets.length).toBeGreaterThanOrEqual(5);
    expect(res.body.hubs.DEN).toBeDefined();
  });

  it('POST /api/calculate returns valid calculation result for valid input', async () => {
    const res = await request(app).post('/api/calculate').send(DEFAULT_SCENARIO);
    expect(res.status).toBe(200);
    expect(res.body.annual.effectivePassCost).toBe(399);
    expect(res.body.tripMatrix).toHaveLength(DEFAULT_SCENARIO.plannedRoundtrips);
  });

  it('POST /api/calculate rejects negative fares and invalid IATA codes', async () => {
    const res = await request(app)
      .post('/api/calculate')
      .send({
        ...DEFAULT_SCENARIO,
        origin: '12',
        annualPassPrice: -100,
        nightsPerTrip: -3,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid scenario parameters');
    expect(res.body.issues.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/export/csv and /api/export/json return downloadable files', async () => {
    const csvRes = await request(app).post('/api/export/csv').send(DEFAULT_SCENARIO);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('GoWild Best-Case Total');

    const jsonRes = await request(app).post('/api/export/json').send(DEFAULT_SCENARIO);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers['content-type']).toContain('application/json');
    expect(jsonRes.body.input.origin).toBe('FLL');
  });
});
