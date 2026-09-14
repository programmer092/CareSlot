import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client';
import { ROLES_KEY } from '../auth.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest<Request>();
    if (!user) throw new UnauthorizedException('Authentication required');

    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `This action requires role: ${required.join(' or ')}`,
      );
    }
    return true;
  }
}
