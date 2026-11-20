import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calculateScenario, formatScenarioCsv } from '../shared/calculator.js';
import { CORRIDOR_PRESETS, HUB_CATALOG } from '../shared/presets.js';
import { validateScenarioInput } from '../shared/validation.js';
import { logJson } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  const startedAt = Date.now();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '64kb' }));

  // Structured Cloud Logging request telemetry (no PII)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path === '/healthz') return;
      logJson('INFO', `${req.method} ${req.path}`, {
        httpRequest: {
          requestMethod: req.method,
          requestUrl: req.path,
          status: res.statusCode,
          latencyMs: Date.now() - start,
        },
      });
    });
    next();
  });

  // Health check endpoint for Cloud Run readiness/liveness probes
  app.get('/healthz', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'gowild-compass',
      version: '2.0.0',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
  });

  // Rate limit API & export endpoints
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in a minute.' },
  });

  app.use('/api', apiLimiter);

  app.get('/api/presets', (_req, res) => {
    res.json({
      presets: CORRIDOR_PRESETS,
      hubs: HUB_CATALOG,
    });
  });

  app.post('/api/calculate', (req, res) => {
    const parsed = validateScenarioInput(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid scenario parameters',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    const result = calculateScenario(parsed.data);
    res.json(result);
  });

  app.post('/api/export/csv', (req, res) => {
    const parsed = validateScenarioInput(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid scenario parameters',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    const result = calculateScenario(parsed.data);
    const csv = formatScenarioCsv(result);
    const slug = `${parsed.data.origin}-${parsed.data.destination}`.toLowerCase();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="gowild-compass-${slug}.csv"`);
    res.status(200).send(csv);
  });

  app.post('/api/export/json', (req, res) => {
    const parsed = validateScenarioInput(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid scenario parameters',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    const result = calculateScenario(parsed.data);
    const slug = `${parsed.data.origin}-${parsed.data.destination}`.toLowerCase();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="gowild-compass-${slug}.json"`);
    res.status(200).send(JSON.stringify(result, null, 2));
  });

  // Serve built Vite SPA in production
  const candidateClientDirs = [
    path.resolve(__dirname, '../../client'), // dist/server/server -> dist/client
    path.resolve(__dirname, '../dist/client'), // dev tsx server/ -> dist/client
  ];
  const clientDistDir = candidateClientDirs.find((dir) =>
    fs.existsSync(path.join(dir, 'index.html')),
  );

  if (clientDistDir) {
    app.use(
      express.static(clientDistDir, {
        maxAge: '1d',
        index: false,
      }),
    );

    app.get(/^\/(?!api\/|healthz$).*/, (_req, res) => {
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  return app;
}
