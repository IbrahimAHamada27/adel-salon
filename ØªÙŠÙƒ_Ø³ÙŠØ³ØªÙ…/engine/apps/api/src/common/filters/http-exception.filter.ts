import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const errorId = crypto.randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'حدث خطأ داخلي في الخادم، يرجى المحاولة لاحقاً';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as any;
        message = body.message || message;
        errorName = body.error || errorName;
      }
    } else if (exception instanceof Error) {
      // Safe sanitized log without sensitive tokens/passwords
      const sanitizedUrl = request.url.split('?')[0]; // Remove query params containing potential tokens
      this.logger.error(
        `[ErrorID: ${errorId}] Unhandled Exception on [${request.method}] ${sanitizedUrl}: ${exception.message}`,
        process.env.NODE_ENV !== 'production' ? exception.stack : undefined,
      );

      // Map common database constraint errors to safe friendly messages
      if (exception.message.includes('FOREIGN KEY constraint failed')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'فشلت العملية لوجود ارتباطات غير صالحة بين السجلات';
        errorName = 'ForeignKeyConstraint';
      } else if (exception.message.includes('UNIQUE constraint failed')) {
        status = HttpStatus.CONFLICT;
        message = 'السجل المطلوب إضافته أو تعديله موجود مسبقاً (تكرار في البيانات الفريدة)';
        errorName = 'DuplicateRecordConstraint';
      }
    }

    const formattedMessage = Array.isArray(message) ? message[0] : message;

    response.status(status).json({
      statusCode: status,
      error: errorName,
      message: formattedMessage,
      errorId: status >= 500 ? errorId : undefined,
      timestamp: new Date().toISOString(),
      path: request.url.split('?')[0],
    });
  }
}

