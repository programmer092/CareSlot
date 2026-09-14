import type { Role } from '../generated/prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface RequestUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: RequestUser;
    }
  }
}
