import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { json, type NextFunction, type Request, type Response } from 'express';
import helmetImport from 'helmet';
import { AppModule } from './app.module.js';
import { config } from './config.js';
import { isMjsccPath, mjsccConfig } from './mjscc/config.js';
import { sameOrigin } from './security/same-origin.middleware.js';

// helmet's middleware. helmet ships ES module and CommonJS builds: read as an ES module (as here),
// its types make the default import the function; read as CommonJS (as Vercel's compiler does),
// they make it the module, with the function as its default. At run time it's the same function.
const helmet = helmetImport as unknown as (typeof import('helmet'))['default'];

// The CSA Portal's API (api.agee.pro).
export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.disable('x-powered-by');
  // security headers (no sniffing, no framing, HSTS, a locked-down content policy...)
  app.use(helmet());
  // Each site may call only its own routes from a browser, with its cookies: the portal everything
  // but the MJSCC evaluation's (/mjscc), and the evaluation's site only those (once it's set up).
  app.enableCors((req: Request, callback) => {
    const mjscc = isMjsccPath(req.url ?? '');
    callback(null, {
      origin: mjscc ? (mjsccConfig ? [mjsccConfig.origin] : false) : [config.portalOrigin],
      credentials: true,
      // PUT: uploading a Gazette PDF to this API in local development (gazette/storage.ts)
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    });
  });
  // the evaluation's routes check their own site instead (MjsccModule); a local Gazette upload is a
  // PDF, not JSON, and carries its own signed link instead
  app.use((req: Request, res: Response, next: NextFunction) =>
    isMjsccPath(req.path) || (req.method === 'PUT' && req.path === '/gazette/files/upload') ? next() : sameOrigin(req, res, next),
  );
  // small JSON bodies only (64 KB: room for a Directory bulk add of a few hundred names), except the
  // Gazette's, which carry a document's whole transcription (4 MB, under Vercel's 4.5 MB)
  const small = json({ limit: '64kb' });
  const large = json({ limit: '4mb' });
  app.use((req: Request, res: Response, next: NextFunction) => (req.path.startsWith('/gazette/') ? large : small)(req, res, next));
  app.use(cookieParser());
  return app;
}

// On Vercel the API is one function: Vercel calls this with each request, which goes to the app
// (made once per running instance, then reused).
type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let handler: Promise<Handler> | undefined;
export default async function vercel(req: IncomingMessage, res: ServerResponse) {
  handler ??= createApp()
    .then(async (app) => {
      await app.init();
      return app.getHttpAdapter().getInstance() as Handler;
    })
    .catch((error: unknown) => {
      // try again with the next request
      handler = undefined;
      throw error;
    });
  (await handler)(req, res);
}

// Elsewhere (locally) it's a server of its own. Tests build the app themselves.
async function bootstrap() {
  const app = await createApp();
  await app.listen(config.port);
}

if (process.env.NODE_ENV !== 'test' && !config.onVercel) {
  bootstrap().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
