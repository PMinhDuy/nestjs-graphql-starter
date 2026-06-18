import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);

    // REST context — return HTTP response instead of throwing GraphQLError
    if (host.getType() === 'http') {
      const ctx = host.switchToHttp();
      const res = ctx.getResponse<Response>();
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        exception instanceof HttpException ? exception.message : 'Internal server error';
      res.status(status).json({ statusCode: status, message });
      return;
    }

    gqlHost.getContext();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && 'message' in response
          ? (response as { message: string }).message
          : exception.message;

      throw new GraphQLError(Array.isArray(message) ? message[0] : message, {
        extensions: { code: status },
      });
    }

    throw new GraphQLError('Internal server error', {
      extensions: { code: HttpStatus.INTERNAL_SERVER_ERROR },
    });
  }
}
