import { app } from './app';
import { ENV } from './config/env';
import { connectDatabase } from './config/prisma';

async function bootstrap() {
  await connectDatabase();

  app.listen(ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`  FedSocial V2 API Server online on port ${ENV.PORT}`);
    console.log(`  Environment: ${ENV.NODE_ENV}`);
    console.log(`  Healthcheck: http://localhost:${ENV.PORT}/health`);
    console.log(`====================================================`);
  });
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error] Failed to start server:', err);
  process.exit(1);
});
