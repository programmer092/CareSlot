import {
  ArgumentsHost,
  Catch,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  users_email_key: 'Email is already registered',
  bookings_one_active_per_slot: 'A requested slot is already booked',
};

interface DriverAdapterMeta {
  driverAdapterError?: {
    cause?: { code?: string; constraint?: { index?: string } };
  };
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    super.catch(this.toHttpException(error), host);
  }

  private toHttpException(
    error: Prisma.PrismaClientKnownRequestError,
  ): HttpException {
    const cause = (error.meta as DriverAdapterMeta | undefined)
      ?.driverAdapterError?.cause;

    if (cause?.code === '23P01') {
      return new ConflictException('Overlaps one of your existing slots');
    }

    switch (error.code) {
      case 'P2002': {
        const constraint = cause?.constraint?.index;
        const message =
          (constraint && UNIQUE_CONSTRAINT_MESSAGES[constraint]) ??
          'Resource already exists';
        return new ConflictException(message);
      }
      case 'P2025':
        return new NotFoundException('Resource not found');
      case 'P2003':
        return new ConflictException(
          'Resource is still referenced by other data',
        );
      default:
        this.logger.error(`Unhandled Prisma error ${error.code}`, error.stack);
        return new InternalServerErrorException();
    }
  }
}
