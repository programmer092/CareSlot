import {
  ArgumentsHost,
  BadRequestException,
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
  slots_provider_id_start_at_end_at_key: 'An identical slot already exists',
  bookings_one_active_per_slot: 'A requested slot is already booked',
};

interface DriverAdapterMeta {
  driverAdapterError?: { cause?: { constraint?: { index?: string } } };
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
    switch (error.code) {
      case 'P2002': {
        const constraint = (error.meta as DriverAdapterMeta | undefined)
          ?.driverAdapterError?.cause?.constraint?.index;
        const message =
          (constraint && UNIQUE_CONSTRAINT_MESSAGES[constraint]) ??
          'Resource already exists';
        return new ConflictException(message);
      }
      case 'P2025':
        return new NotFoundException('Resource not found');
      case 'P2003':
        return new BadRequestException('Related resource does not exist');
      default:
        this.logger.error(`Unhandled Prisma error ${error.code}`, error.stack);
        return new InternalServerErrorException();
    }
  }
}
