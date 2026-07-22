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

    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any)?.message || 'Unexpected error';
    } else if (exception?.response?.status) {
      // AxiosError — usa o status HTTP real da resposta externa
      status = exception.response.status;
      message = `Serviço externo retornou ${status}: ${exception.response.statusText || 'erro desconhecido'}`;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception?.message || 'Internal server error';
    }

    const formattedError: AppErrorDto = {
      success: false,
      data: null,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
      errors: null,
    };

    response.status(status).json(formattedError);
  }
}