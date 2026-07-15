import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BaseResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        message: 'OK',
        meta: {
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - now,
        },
        errors: null,
      })),
    );
  }
}
