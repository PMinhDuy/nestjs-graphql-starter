// src/lambda.ts
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { configure as serverlessExpress } from "@vendia/serverless-express";
import {
  APIGatewayProxyEvent,
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
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*",
  });

  await app.init();

  return serverlessExpress({ app: expressApp });
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> => {
  // Prevents Lambda from hanging while TypeORM DB connections remain open
  context.callbackWaitsForEmptyEventLoop = false;

  // Bootstrap once per execution environment; reused on warm invocations
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }

  return cachedServer(event, context, callback) as Promise<APIGatewayProxyResult>;
};
