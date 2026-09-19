import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { prismaErrorToHttp } from './prisma-error.mapper';

function prismaError(
  code: string,
  cause?: { code?: string; constraint?: { index?: string } },
) {
  return new Prisma.PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: 'test',
    meta: cause ? { driverAdapterError: { cause } } : undefined,
  });
}

describe('prismaErrorToHttp', () => {
  beforeAll(() => Logger.overrideLogger(false));

  it('maps the one-active-booking-per-slot unique index to a 409 with a clear message', () => {
    const http = prismaErrorToHttp(
      prismaError('P2002', {
        constraint: { index: 'bookings_one_active_per_slot' },
      }),
    );
    expect(http).toBeInstanceOf(ConflictException);
    expect(http.message).toBe('A requested slot is already booked');
  });

  it('maps the users.email unique index to "Email is already registered"', () => {
    const http = prismaErrorToHttp(
      prismaError('P2002', { constraint: { index: 'users_email_key' } }),
    );
    expect(http.getStatus()).toBe(409);
    expect(http.message).toBe('Email is already registered');
  });

  it('falls back to a generic 409 for an unknown unique constraint', () => {
    const http = prismaErrorToHttp(prismaError('P2002'));
    expect(http.getStatus()).toBe(409);
    expect(http.message).toBe('Resource already exists');
  });

  it('maps the slot-overlap exclusion constraint (SQLSTATE 23P01) to 409', () => {
    const http = prismaErrorToHttp(prismaError('P2039', { code: '23P01' }));
    expect(http).toBeInstanceOf(ConflictException);
    expect(http.message).toBe('Overlaps one of your existing slots');
  });

  it('maps a CHECK constraint violation (SQLSTATE 23514) to 400', () => {
    const http = prismaErrorToHttp(prismaError('P2039', { code: '23514' }));
    expect(http).toBeInstanceOf(BadRequestException);
  });

  it('maps record-not-found (P2025) to 404 and a foreign-key violation (P2003) to 409', () => {
    expect(prismaErrorToHttp(prismaError('P2025'))).toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaErrorToHttp(prismaError('P2003'))).toBeInstanceOf(
      ConflictException,
    );
  });

  it('hides any other Prisma error behind a generic 500', () => {
    const http = prismaErrorToHttp(prismaError('P1001'));
    expect(http).toBeInstanceOf(InternalServerErrorException);
    expect(http.message).toBe('Internal server error');
  });
});
