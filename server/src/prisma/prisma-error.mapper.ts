import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

const logger = new Logger('PrismaErrorMapper');

/** Friendly messages for the unique constraints defined in the migrations. */
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  users_email_key: 'Email is already registered',
  bookings_one_active_per_slot: 'A requested slot is already booked',
};

/** Shape of the Postgres driver-adapter error attached to Prisma's meta. */
interface DriverAdapterMeta {
  driverAdapterError?: {
    cause?: { code?: string; constraint?: { index?: string } };
  };
}

/**
 * Translates a Prisma error into the HTTP error it means, so services can let
 * the database enforce its constraints without try/catch:
 *
 *   P2002  unique violation      -> 409 Conflict
 *   23P01  exclusion violation   -> 409 Conflict (slot overlap)
 *   P2025  record not found      -> 404 Not Found
 *   P2003  foreign key violation -> 409 Conflict (row still referenced)
 *   other                        -> 500 (logged)
 */
export function prismaErrorToHttp(
  error: Prisma.PrismaClientKnownRequestError,
): HttpException {
  const cause = (error.meta as DriverAdapterMeta | undefined)
    ?.driverAdapterError?.cause;

  // Postgres exclusion constraint (slots_no_overlap_per_provider); Prisma has
  // no dedicated code for it, so it arrives as a generic driver error.
  if (cause?.code === '23P01') {
    return new ConflictException('Overlaps one of your existing slots');
  }

  switch (error.code) {
    case 'P2002': {
      const constraint = cause?.constraint?.index;
      return new ConflictException(
        (constraint && UNIQUE_CONSTRAINT_MESSAGES[constraint]) ??
          'Resource already exists',
      );
    }
    case 'P2025':
      return new NotFoundException('Resource not found');
    case 'P2003':
      return new ConflictException(
        'Resource is still referenced by other data',
      );
    default:
      logger.error(`Unhandled Prisma error ${error.code}`, error.stack);
      return new InternalServerErrorException('Internal server error');
  }
}
