// src/lambda.ts
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { configure as serverlessExpress } from "@vendia/serverless-express";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Callback,
  Context,
  Handler,
} from "aws-lambda";
import express from "express";
import { AppModule } from "./app.module";

let cachedServer: Handler;

async function bootstrap(): Promise<Handler> {
  const expressApp = express();

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ["error", "warn"] }
  );

  app.setGlobalPrefix("api");
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  app.enableCors({
    origin: !allowedOrigins || allowedOrigins === "*" ? "*" : allowedOrigins.split(","),
  });

  await app.init();

  return serverlessExpress({ app: expressApp });
}

export const handler = async (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
  context: Context,
  callback: Callback<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> => {
  context.callbackWaitsForEmptyEventLoop = false;

  // API Gateway HTTP API uses payload format 2.0 — method is in requestContext.http.method.
  // Short-circuit OPTIONS preflight before serverless-express to guarantee a 200 response.
  const method =
    (event as APIGatewayProxyEvent).httpMethod ||
    (event as APIGatewayProxyEventV2).requestContext?.http?.method;
  const origin = event.headers?.["origin"] || event.headers?.["Origin"] || "*";

  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept,X-Requested-With",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  if (!cachedServer) {
    cachedServer = await bootstrap();
  }

  return cachedServer(event, context, callback) as Promise<APIGatewayProxyResult>;
};
