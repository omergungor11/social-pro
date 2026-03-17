import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

interface ErrorResponse {
  error: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  };
}

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

function resolveMessage(body: HttpExceptionBody): string {
  if (Array.isArray(body.message)) {
    return body.message.join(", ");
  }
  return body.message ?? "An unexpected error occurred";
}

function resolveCode(body: HttpExceptionBody, status: number): string {
  if (body.error) {
    return body.error.toUpperCase().replace(/\s+/g, "_");
  }
  return HttpStatus[status] ?? "INTERNAL_SERVER_ERROR";
}

function resolveDetails(body: HttpExceptionBody): unknown | undefined {
  if (Array.isArray(body.message) && body.message.length > 1) {
    return body.message;
  }
  return undefined;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const rawBody = exception.getResponse();

    const body: HttpExceptionBody =
      typeof rawBody === "string"
        ? { message: rawBody }
        : (rawBody as HttpExceptionBody);

    const errorResponse: ErrorResponse = {
      error: {
        statusCode: status,
        code: resolveCode(body, status),
        message: resolveMessage(body),
        details: resolveDetails(body),
      },
    };

    this.logger.warn(
      `${request.method} ${request.url} → ${status}: ${errorResponse.error.message}`
    );

    response.status(status).json(errorResponse);
  }
}
