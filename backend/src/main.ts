import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PinoLoggerService } from './infra/logging/pino-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new PinoLoggerService(),
  });

  app.enableCors();
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
}

bootstrap();
