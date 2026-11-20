import { createApp } from './app.js';
import { logJson } from './logger.js';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = '0.0.0.0';

const app = createApp();
const server = app.listen(PORT, HOST, () => {
  logJson('INFO', `GoWild Compass server listening on http://${HOST}:${PORT}`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV ?? 'development',
  });
});

function shutdown(signal: string) {
  logJson('INFO', `Received ${signal}, shutting down gracefully`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
