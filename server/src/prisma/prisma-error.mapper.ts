import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

const logger = new Logger('PrismaErrorMapper');

const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  users_email_key: 'Email is already registered',
  bookings_one_active_per_slot: 'A requested slot is already booked',
};

interface DriverAdapterMeta {
  driverAdapterError?: {
    cause?: { code?: string; constraint?: { index?: string } };
  };
}

export function prismaErrorToHttp(
  error: Prisma.PrismaClientKnownRequestError,
): HttpException {
  const cause = (error.meta as DriverAdapterMeta | undefined)
    ?.driverAdapterError?.cause;

  if (cause?.code === '23P01') {
    return new ConflictException('Overlaps one of your existing slots');
  }
  if (cause?.code === '23514') {
    return new BadRequestException('Data violates a database rule');
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
