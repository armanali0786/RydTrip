import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { getProxyRoutes, matchRoute } from '../proxy/routes';

export interface AuthenticatedUser {
  sub: string;
  role: 'rider' | 'driver';
  phone: string;
}

export type RequestWithUser = Request & { user?: AuthenticatedUser };

// Account creation and login are the only ways to obtain a token, so they
// can't require one themselves. GET /drivers/nearby is public so a guest can
// see a real fare estimate before logging in (see RiderPage's guest-browsing
// design); it only returns driverId/coords/distance, no PII.
const PUBLIC_ROUTES: ReadonlyArray<{ method: string; path: string }> = [
  { method: 'POST', path: '/riders' },
  { method: 'POST', path: '/riders/login' },
  { method: 'POST', path: '/drivers' },
  { method: 'POST', path: '/drivers/login' },
  { method: 'GET', path: '/drivers/nearby' },
];

// GET /drivers/:id/vehicle is the PII-free companion to /drivers/nearby above
// — same guest-estimate flow, needs the dynamic :id segment so it can't be a
// plain PUBLIC_ROUTES entry. GET /drivers/:id (full profile, with phone/email)
// stays behind auth.
const PUBLIC_PATTERNS: ReadonlyArray<{ method: string; pattern: RegExp }> = [
  { method: 'GET', pattern: /^\/drivers\/[^/]+\/vehicle$/ },
];

function isPublicRoute(method: string, path: string): boolean {
  if (PUBLIC_ROUTES.some((route) => route.method === method && route.path === path)) {
    return true;
  }
  return PUBLIC_PATTERNS.some((route) => route.method === method && route.pattern.test(path));
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();

    if (req.path.startsWith('/health')) {
      return true;
    }

    // No configured route for this path: let ProxyController return its own
    // 404 rather than masking it behind a 401.
    if (!matchRoute(req.path, getProxyRoutes())) {
      return true;
    }

    if (isPublicRoute(req.method, req.path)) {
      return true;
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      req.user = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
