import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedPayload<T> {
  data: T;
  meta: PaginationMeta;
}

interface WrappedResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

function isPaginatedPayload<T>(
  value: unknown
): value is PaginatedPayload<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "meta" in value &&
    typeof (value as Record<string, unknown>)["meta"] === "object"
  );
}

function hasDataKey(value: unknown): value is { data: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    !("error" in value)
  );
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, WrappedResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<WrappedResponse<T>> {
    return next.handle().pipe(
      map((response): WrappedResponse<T> => {
        // Paginated response: { data, meta } — extract both fields
        if (isPaginatedPayload<T>(response)) {
          return {
            data: response.data,
            meta: response.meta,
          };
        }

        // Response already wrapped with a `data` key — pass through
        if (hasDataKey(response)) {
          return response as unknown as WrappedResponse<T>;
        }

        // Plain response — wrap in { data }
        return { data: response };
      })
    );
  }
}
