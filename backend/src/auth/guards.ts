import {
  applyDecorators,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role, User } from '../generated/prisma/client.js';
import { SessionsService } from './sessions.service.js';

type SignedInRequest = Request & { user?: User };

// Authentication: the route needs a live session. The account is attached to the request.
@Injectable()
export class SignedIn implements CanActivate {
  constructor(private readonly sessions: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<SignedInRequest>();
    const user = await this.sessions.current(req);
    if (!user) throw new UnauthorizedException({ code: 'unauthenticated' });
    req.user = user;
    return true;
  }
}

// Authorisation: @Roles('STAFF', 'ADMIN') on a controller or route lets only signed-in accounts
// with those roles in. (It runs SignedIn itself, first, so the account is known when HasRole looks.)
const ROLES = 'roles';
export const Roles = (...roles: Role[]) => applyDecorators(SetMetadata(ROLES, roles), UseGuards(SignedIn, HasRole));

@Injectable()
export class HasRole implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<SignedInRequest>().user;
    if (!user || !roles.includes(user.role)) throw new ForbiddenException({ code: 'forbidden' });
    return true;
  }
}

// @MainAccountOnly() on a controller or route lets only the portal's main account in.
@Injectable()
export class IsMainAccount implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<SignedInRequest>().user;
    if (!user?.mainAccount) throw new ForbiddenException({ code: 'forbidden' });
    return true;
  }
}

export const MainAccountOnly = () => UseGuards(SignedIn, IsMainAccount);

// the signed-in account, in a route that uses SignedIn
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<SignedInRequest>().user,
);
