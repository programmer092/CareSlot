import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE, IS_PUBLIC_KEY } from '../auth.constants';
import type { JwtPayload } from '../auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) { }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Authentication required');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined>;
    if (cookies?.[ACCESS_TOKEN_COOKIE]) return cookies[ACCESS_TOKEN_COOKIE];

    const [scheme, value] = req.headers.authorization?.split(' ') ?? [];
    return scheme === 'Bearer' ? value : undefined;
  }
}
