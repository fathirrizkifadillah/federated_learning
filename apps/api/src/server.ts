import { app } from './app';
import { ENV } from './config/env';
import { connectDatabase } from './config/prisma';

async function bootstrap() {
  await connectDatabase();

  const server = app.listen(ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`  FedSocial V2 API Server online on port ${ENV.PORT}`);
    console.log(`  Environment: ${ENV.NODE_ENV}`);
    console.log(`  Healthcheck: http://localhost:${ENV.PORT}/health`);
    console.log(`====================================================`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`\n[Server Notice] Port ${ENV.PORT} is already bound by another active process.`);
      console.warn(`The FedSocial API is already running at http://localhost:${ENV.PORT}/api/v1.`);
      console.warn(`To free ports completely, run 'npm run clean:ports'.\n`);
      process.exit(0);
    } else {
      console.error('[Server Error]', err);
      process.exit(1);
    }
  });
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error] Failed to start server:', err);
  process.exit(1);
});
