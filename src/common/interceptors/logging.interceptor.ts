import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const now = Date.now();

    this.logger.log(`Incoming Request: [${method}] ${url}`);

    return next
      .handle()
      .pipe(
        tap(() =>
          this.logger.log(
            `Request Completed: [${method}] ${url} - ${Date.now() - now}ms`,
          ),
        ),
      );
  }
}
