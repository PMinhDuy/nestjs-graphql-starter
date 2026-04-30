import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class HttpExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown, _host: ArgumentsHost) {
    GqlArgumentsHost.create(_host);

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
