import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import type { ApiResponse } from './api-response';
import { PaginatedResult } from './pagination';


@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown> | undefined> {
    return next.handle().pipe(
      map((body: unknown) => {
        if (body === undefined) return undefined;
        if (body instanceof PaginatedResult) {
          return {
            success: true,
            data: body.items,
            meta_data: body.meta,
            error: null,
          };
        }
        return { success: true, data: body, meta_data: null, error: null };
      }),
    );
  }
}
