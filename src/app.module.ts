import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { Request } from 'express';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FinanceModule } from './modules/finance/finance.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { User } from './modules/users/user.entity';
import { Transaction } from './modules/finance/transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Lambda's /var/task filesystem is read-only; generate schema in memory there
      autoSchemaFile: process.env.AWS_LAMBDA_FUNCTION_NAME
        ? true
        : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      csrfPrevention: false,
      context: ({ req }: { req: Request }) => ({ req }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432'),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'nestjs_graphql',
        // Explicit list required for esbuild bundling (glob patterns don't survive bundling)
        entities: [User, Transaction],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
    AuthModule,
    UsersModule,
    FinanceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
