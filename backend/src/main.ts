import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { config } from './config.js';
import { sameOrigin } from './security/same-origin.middleware.js';

// The CSA Portal's API (api.agee.pro). On Vercel the whole app runs as one function.
export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.disable('x-powered-by');
  // security headers (no sniffing, no framing, HSTS, a locked-down content policy...)
  app.use(helmet());
  // only the portal may call the API from a browser, with its cookies
  app.enableCors({
    origin: [config.portalOrigin],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
  });
  app.use(sameOrigin);
  // small JSON bodies only (64 KB: room for a Directory bulk add of a few hundred names)
  app.useBodyParser('json', { limit: '64kb' });
  app.use(cookieParser());
  return app;
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(config.port);
}

// tests build the app themselves
if (process.env.NODE_ENV !== 'test') await bootstrap();
