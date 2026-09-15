import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prismaErrorToHttp } from '../prisma/prisma-error.mapper';
import type { ApiResponse } from './api-response';

/**
 * Every error leaves the API in the same envelope as success responses:
 * `{ success: false, data: null, meta_data: null, error: "<message>" }`.
 * Prisma errors are first translated to HTTP errors; anything unexpected
 * becomes a logged 500 with a generic message (never a stack trace).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = this.toHttpException(exception);
    const status = http.getStatus();

    const body: ApiResponse<never> = {
      success: false,
      data: null,
      meta_data: null,
      error: this.messageOf(http),
    };
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private toHttpException(exception: unknown): HttpException {
    if (exception instanceof HttpException) return exception;
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return prismaErrorToHttp(exception);
    }
    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );
    return new InternalServerErrorException('Internal server error');
  }

  /** Nest puts validation messages in an array; flatten to one string. */
  private messageOf(http: HttpException): string {
    const res = http.getResponse();
    const message =
      typeof res === 'object' && res !== null && 'message' in res
        ? (res as { message: string | string[] }).message
        : http.message;
    return Array.isArray(message) ? message.join('. ') : message;
  }
}
