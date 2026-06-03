import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const handlerName = context.getHandler().name;
    const className = context.getClass().name;

    // Resolve operation name for GraphQL context
    let operationName = `${className}.${handlerName}`;
    try {
      const gqlCtx = GqlExecutionContext.create(context);
      const info = gqlCtx.getInfo();
      if (info?.fieldName) operationName = info.fieldName;
    } catch {
      // Not a GraphQL context — keep the class.handler format
    }

    return next.handle().pipe(
      tap({
        next: () => {
          console.log(JSON.stringify({ op: operationName, ms: Date.now() - start }));
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error(JSON.stringify({ op: operationName, ms: Date.now() - start, error: message }));
        },
      }),
    );
  }
}
