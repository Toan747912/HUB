import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ObservabilityHttpInterceptor } from './infrastructure/observability/observability-http.interceptor';
import { getCorsOrigin, getRequestBodyLimit } from './infrastructure/security/secrets/security.config';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { TraceLoggingInterceptor } from './shared/interceptors/trace-logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(express.json({ limit: getRequestBodyLimit() }));
  app.enableCors({
    origin: getCorsOrigin(),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors.map((e) => ({
          field: e.property,
          constraints: e.constraints ?? {},
          children: e.children ?? []
        }));
        return new BadRequestException({
          success: false,
          error: 'VALIDATION_FAILED',
          message: 'Validation failed',
          details
        });
      }
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TraceLoggingInterceptor(), app.get(ObservabilityHttpInterceptor));

  app.enableShutdownHooks();

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port);
}
bootstrap();
