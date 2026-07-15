import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppErrorDto } from 'src/dtos/app-error.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const formattedError: AppErrorDto = {
      success: false,
      data: null,
      message:
        typeof message === 'string'
          ? message
          : (message as any)?.message || 'Unexpected error',
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
      errors: Array.isArray((message as any)?.message)
        ? (message as any).message
        : typeof message === 'object'
          ? (message as any)?.errors
          : null,
    };

    response.status(status).json(formattedError);
  }
}
