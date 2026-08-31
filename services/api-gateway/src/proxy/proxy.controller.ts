import { randomUUID } from 'node:crypto';
import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { getProxyRoutes, matchRoute } from './routes';

/**
 * Thin reverse proxy: routes to the owning service and injects a
 * correlation ID, per overview.md's API Gateway responsibility statement.
 * No request/response schema validation here — that's each downstream
 * service's job.
 */
@Controller()
export class ProxyController {
  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response): Promise<void> {
    const route = matchRoute(req.path, getProxyRoutes());

    if (!route) {
      res.status(404).json({ statusCode: 404, message: `No route configured for ${req.path}` });
      return;
    }

    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
    const upstreamUrl = `${route.target}${req.originalUrl}`;
    const hasBody = !['GET', 'HEAD'].includes(req.method);

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: req.method,
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': correlationId,
        },
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      });

      const contentType = upstreamResponse.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');
      const responseBody = isJson ? await upstreamResponse.json() : await upstreamResponse.text();

      res.status(upstreamResponse.status).set('x-correlation-id', correlationId).send(responseBody);
    } catch {
      res.status(502).json({
        statusCode: 502,
        message: `Upstream service for ${route.prefix} is unreachable`,
      });
    }
  }
}
