import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'];

    this.logger.log(
      `Request Method: ${method}, Request URL: ${originalUrl}, Client IP: ${ip}, User-Agent: ${userAgent}`,
    );

    next();
  }
}
